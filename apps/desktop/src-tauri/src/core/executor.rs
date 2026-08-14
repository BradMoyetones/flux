use std::sync::Arc;
use petgraph::graphmap::DiGraphMap;
use petgraph::algo::toposort;
use crate::models::workflow::Workflow;
use crate::core::context::ExecutionContext;
use crate::core::events::{emit_node_event, emit_workflow_event};
use crate::core::interpolator::interpolate_value;
use crate::core::logger::{log_info, log_warn, log_error, log_debug};
use crate::models::runtime::{NodeExecutionEvent, NodeStatus, WorkflowExecutionEvent};
use crate::plugins::registry::PluginRegistry;
use crate::plugins::http::plugin::HttpPlugin;
use crate::plugins::whatsapp::plugin::WhatsAppPlugin;
use tauri::{AppHandle, Manager, Emitter};
use std::collections::HashMap;
use tokio::sync::watch;
use tokio::task::JoinSet;
use crate::errors::AppError;

/// Construye el registry global con todos los plugins disponibles.
fn build_registry() -> PluginRegistry {
    let mut registry = PluginRegistry::new();
    registry.register(Arc::new(HttpPlugin));
    registry.register(Arc::new(WhatsAppPlugin));
    registry
}

pub async fn execute_workflow(app: AppHandle, workflow: Workflow) -> Result<(), AppError> {
    log_info(&app, &workflow.id, None, &format!("▶ Iniciando workflow '{}' ({} nodos)", workflow.name, workflow.nodes.len()));
    let workflow_name_clone = workflow.name.clone();
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
        Err(_) => return Err(AppError::InvalidConfig("Ciclo detectado en el DAG del workflow".into())),
    };
    let custom_variables = {
        let state = app.state::<Arc<crate::state::AppState>>();
        let config = state.config.read().await;
        config.variables.clone()
    };
    let ctx = Arc::new(ExecutionContext::new(app.clone(), custom_variables));

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
                        return Err(AppError::Internal(format!("Dependencia falló o fue cancelada para el nodo '{}'", node_id)));
                    }
                }
                if *rx.borrow() == Some(false) {
                    log_warn(&app_clone, &workflow_id, Some(&node.id), &format!("⊘ Nodo '{}' cancelado: dependencia falló", node.label));
                    let _ = tx.send(Some(false));
                    return Err(AppError::StepExecution { step_id: node.id.clone(), message: "Cancelado: Un nodo padre falló".into() });
                }
            }

            log_info(&app_clone, &workflow_id, Some(&node.id), &format!("▶ Ejecutando nodo '{}' ({})", node.label, node.node_type));

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
                                result: Some(result.clone()),
                                error: None,
                            });
                            
                            log_info(&app_clone, &workflow_id, Some(&node.id), &format!("✓ Nodo '{}' completado", node.label));
                            log_debug(&app_clone, &workflow_id, Some(&node.id), &result.to_string());
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
                            log_error(&app_clone, &workflow_id, Some(&node.id), &format!("✗ Nodo '{}' falló: {}", node.label, error), None);
                            let _ = tx.send(Some(false));
                            Err(AppError::StepExecution { step_id: node.id.clone(), message: format!("Nodo falló: {}", error) })
                        }
                    }
                }
                None => {
                    log_error(&app_clone, &workflow_id, Some(&node.id), &format!("✗ Plugin '{}' no registrado", node.node_type), None);
                    let error = format!("Plugin '{}' no registrado", node.node_type);
                    emit_node_event(&app_clone, &NodeExecutionEvent {
                        workflow_id: workflow_id.clone(),
                        node_id: node.id.clone(),
                        status: NodeStatus::Error,
                        result: None,
                        error: Some(error.clone()),
                    });
                    let _ = tx.send(Some(false));
                    Err(AppError::InvalidConfig(error))
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
                    first_error = Some(AppError::Internal(format!("Error interno del task runtime: {}", e)));
                }
            }
        }
    }

    if workflow_failed {
        let err_obj = first_error.unwrap_or_else(|| AppError::Internal("Error desconocido".into()));
        let err_msg = err_obj.to_string();
        
        log_error(&app, &workflow.id, None, &format!("✗ Workflow '{}' falló: {}", workflow_name_clone, err_msg), None);
        emit_workflow_event(&app, &WorkflowExecutionEvent {
            workflow_id: workflow.id.clone(),
            status: NodeStatus::Error,
        });
        
        let _ = crate::services::notifications::notify_flow_error(&app, &workflow_name_clone, &err_msg);
        
        return Err(err_obj);
    }

    log_info(&app, &workflow.id, None, &format!("✓ Workflow '{}' completado exitosamente", workflow_name_clone));
    emit_workflow_event(&app, &WorkflowExecutionEvent {
        workflow_id: workflow.id.clone(),
        status: NodeStatus::Success,
    });
    
    let _ = crate::services::notifications::notify_flow_success(&app, &workflow_name_clone);
    
    // Actualizar metadata de ejecución
    let mut updated_workflow = workflow.clone();
    let mut meta = updated_workflow.metadata.unwrap_or_default();
    meta.last_execution = Some(chrono::Utc::now().to_rfc3339());
    meta.total_executions += 1;
    updated_workflow.metadata = Some(meta.clone());
    
    // Emitir evento para React
    let _ = app.emit("workflow://metadata-updated", serde_json::json!({
        "path": updated_workflow.path.clone(),
        "metadata": meta,
    }));
    
    // Persistencia asíncrona no bloqueante
    if let Some(path) = updated_workflow.path.clone() {
        tauri::async_runtime::spawn(async move {
            match serde_json::to_string_pretty(&updated_workflow) {
                Ok(json_content) => {
                    if let Err(e) = std::fs::write(&path, json_content) {
                        eprintln!("Error saving workflow metadata to {}: {}", path, e);
                    }
                }
                Err(e) => eprintln!("Error serializing workflow metadata: {}", e),
            }
        });
    }

    Ok(())
}
