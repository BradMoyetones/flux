use std::sync::Arc;
use petgraph::graphmap::DiGraphMap;
use petgraph::algo::toposort;
use crate::models::workflow::Workflow;
use crate::core::context::ExecutionContext;
use crate::core::events::{emit_node_event, emit_workflow_event};
use crate::core::interpolator::interpolate_value;
use crate::models::runtime::{NodeExecutionEvent, NodeStatus, WorkflowExecutionEvent};
use crate::plugins::registry::PluginRegistry;
use crate::plugins::http::plugin::HttpPlugin;
use crate::plugins::whatsapp::plugin::WhatsAppPlugin;
use tauri::AppHandle;
use std::collections::HashMap;
use tokio::sync::watch;
use tokio::task::JoinSet;

/// Construye el registry global con todos los plugins disponibles.
fn build_registry() -> PluginRegistry {
    let mut registry = PluginRegistry::new();
    registry.register(Arc::new(HttpPlugin));
    registry.register(Arc::new(WhatsAppPlugin));
    registry
}

pub async fn execute_workflow(app: AppHandle, workflow: Workflow) -> Result<(), String> {
    let registry = Arc::new(build_registry());
    let mut graph = DiGraphMap::new();
    let mut node_map = HashMap::new();
    
    // Poblamos el grafo
    for node in &workflow.nodes {
        graph.add_node(node.id.as_str());
        node_map.insert(node.id.clone(), node.clone());
    }

    let mut parent_map: HashMap<String, Vec<String>> = HashMap::new();
    for node in &workflow.nodes {
        parent_map.insert(node.id.clone(), Vec::new());
    }

    for edge in &workflow.edges {
        graph.add_edge(edge.source.as_str(), edge.target.as_str(), ());
        if let Some(parents) = parent_map.get_mut(&edge.target) {
            parents.push(edge.source.clone());
        }
    }

    // Topological sort para validar ciclos
    let sorted_nodes = match toposort(&graph, None) {
        Ok(sorted) => sorted,
        Err(_) => return Err("Ciclo detectado en el DAG del workflow".into()),
    };

    let ctx = Arc::new(ExecutionContext::new(app.clone()));

    emit_workflow_event(&app, &WorkflowExecutionEvent {
        workflow_id: workflow.id.clone(),
        status: NodeStatus::Running,
    });

    // Creamos canales Watch (None = Ejecutando/Pendiente, Some(true) = Éxito, Some(false) = Error)
    let mut tx_map = HashMap::new();
    let mut rx_map = HashMap::new();

    for node_id in sorted_nodes {
        let (tx, rx) = watch::channel(None);
        tx_map.insert(node_id.to_string(), tx);
        rx_map.insert(node_id.to_string(), rx);
    }

    let mut join_set = JoinSet::new();

    // Spawneamos todos los nodos
    for (node_id, node) in node_map {
        let parents = parent_map.get(&node_id).cloned().unwrap_or_default();
        let mut parent_rxs = Vec::new();
        for p in parents {
            if let Some(rx) = rx_map.get(&p) {
                parent_rxs.push(rx.clone());
            }
        }
        
        let tx = tx_map.remove(&node_id).unwrap();
        let ctx_clone = Arc::clone(&ctx);
        let app_clone = app.clone();
        let registry_clone = Arc::clone(&registry);
        let workflow_id = workflow.id.clone();

        join_set.spawn(async move {
            // Esperar a los padres
            for mut rx in parent_rxs {
                while rx.borrow().is_none() {
                    if rx.changed().await.is_err() {
                        // El padre fue destruido inesperadamente
                        let _ = tx.send(Some(false));
                        return Err(format!("Dependencia falló o fue cancelada para el nodo '{}'", node_id));
                    }
                }
                if *rx.borrow() == Some(false) {
                    let _ = tx.send(Some(false));
                    return Err(format!("Cancelado: Un nodo padre falló para '{}'", node_id));
                }
            }

            emit_node_event(&app_clone, &NodeExecutionEvent {
                workflow_id: workflow_id.clone(),
                node_id: node.id.clone(),
                status: NodeStatus::Running,
                result: None,
                error: None,
            });

            // Interpolar config
            let interpolated_config = interpolate_value(&node.config, &ctx_clone);

            // Buscar plugin
            match registry_clone.get(&node.node_type) {
                Some(plugin) => {
                    match plugin.execute(&ctx_clone, &interpolated_config).await {
                        Ok(result) => {
                            ctx_clone.set_node_result(&node.id, result.clone());
                            if !node.name.is_empty() {
                                ctx_clone.set_node_result(&node.name, result.clone());
                            }

                            emit_node_event(&app_clone, &NodeExecutionEvent {
                                workflow_id: workflow_id.clone(),
                                node_id: node.id.clone(),
                                status: NodeStatus::Success,
                                result: Some(result),
                                error: None,
                            });
                            
                            let _ = tx.send(Some(true));
                            Ok(())
                        }
                        Err(error) => {
                            emit_node_event(&app_clone, &NodeExecutionEvent {
                                workflow_id: workflow_id.clone(),
                                node_id: node.id.clone(),
                                status: NodeStatus::Error,
                                result: None,
                                error: Some(error.clone()),
                            });
                            let _ = tx.send(Some(false));
                            Err(format!("Nodo '{}' falló: {}", node.id, error))
                        }
                    }
                }
                None => {
                    let error = format!("Plugin '{}' no registrado", node.node_type);
                    emit_node_event(&app_clone, &NodeExecutionEvent {
                        workflow_id: workflow_id.clone(),
                        node_id: node.id.clone(),
                        status: NodeStatus::Error,
                        result: None,
                        error: Some(error.clone()),
                    });
                    let _ = tx.send(Some(false));
                    Err(error)
                }
            }
        });
    }

    // Recolectar resultados de todas las tareas
    let mut workflow_failed = false;
    let mut first_error = None;

    while let Some(res) = join_set.join_next().await {
        match res {
            Ok(Ok(_)) => {}
            Ok(Err(err)) => {
                workflow_failed = true;
                if first_error.is_none() {
                    first_error = Some(err);
                }
            }
            Err(e) => {
                workflow_failed = true;
                if first_error.is_none() {
                    first_error = Some(format!("Error interno del task runtime: {}", e));
                }
            }
        }
    }

    if workflow_failed {
        emit_workflow_event(&app, &WorkflowExecutionEvent {
            workflow_id: workflow.id.clone(),
            status: NodeStatus::Error,
        });
        return Err(first_error.unwrap_or_else(|| "Error desconocido".into()));
    }

    emit_workflow_event(&app, &WorkflowExecutionEvent {
        workflow_id: workflow.id.clone(),
        status: NodeStatus::Success,
    });

    Ok(())
}
