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

/// Construye el registry global con todos los plugins disponibles.
fn build_registry() -> PluginRegistry {
    let mut registry = PluginRegistry::new();
    registry.register(Arc::new(HttpPlugin));
    registry.register(Arc::new(WhatsAppPlugin));
    registry
}

pub async fn execute_workflow(app: AppHandle, workflow: Workflow) -> Result<(), String> {
    let registry = build_registry();
    let mut graph = DiGraphMap::new();
    let mut node_map = HashMap::new();

    // Populate graph (DAG)
    for node in &workflow.nodes {
        graph.add_node(node.id.as_str());
        node_map.insert(node.id.as_str(), node);
    }

    for edge in &workflow.edges {
        graph.add_edge(edge.source.as_str(), edge.target.as_str(), ());
    }

    // Topological sort — la columna vertebral del DAG
    let sorted_nodes = match toposort(&graph, None) {
        Ok(sorted) => sorted,
        Err(_) => return Err("Ciclo detectado en el DAG del workflow".into()),
    };

    let mut ctx = ExecutionContext::new(app.clone());

    emit_workflow_event(&app, &WorkflowExecutionEvent {
        workflow_id: workflow.id.clone(),
        status: NodeStatus::Running,
    });

    for node_id in sorted_nodes {
        let node = node_map.get(node_id).unwrap();

        emit_node_event(&app, &NodeExecutionEvent {
            workflow_id: workflow.id.clone(),
            node_id: node.id.clone(),
            status: NodeStatus::Running,
            result: None,
            error: None,
        });

        // 1. Interpolar la configuración del nodo con los resultados de nodos previos
        let interpolated_config = interpolate_value(&node.config, &ctx);

        // 2. Buscar el plugin por type
        match registry.get(&node.node_type) {
            Some(plugin) => {
                match plugin.execute(&mut ctx, &interpolated_config).await {
                    Ok(result) => {
                        ctx.set_node_result(&node.id, result.clone());

                        emit_node_event(&app, &NodeExecutionEvent {
                            workflow_id: workflow.id.clone(),
                            node_id: node.id.clone(),
                            status: NodeStatus::Success,
                            result: Some(result),
                            error: None,
                        });
                    }
                    Err(error) => {
                        emit_node_event(&app, &NodeExecutionEvent {
                            workflow_id: workflow.id.clone(),
                            node_id: node.id.clone(),
                            status: NodeStatus::Error,
                            result: None,
                            error: Some(error.clone()),
                        });

                        // Abortar el flujo al primer error (política por defecto)
                        emit_workflow_event(&app, &WorkflowExecutionEvent {
                            workflow_id: workflow.id.clone(),
                            status: NodeStatus::Error,
                        });

                        return Err(format!("Nodo '{}' falló: {}", node.id, error));
                    }
                }
            }
            None => {
                let error = format!("Plugin '{}' no registrado", node.node_type);
                emit_node_event(&app, &NodeExecutionEvent {
                    workflow_id: workflow.id.clone(),
                    node_id: node.id.clone(),
                    status: NodeStatus::Error,
                    result: None,
                    error: Some(error.clone()),
                });

                emit_workflow_event(&app, &WorkflowExecutionEvent {
                    workflow_id: workflow.id.clone(),
                    status: NodeStatus::Error,
                });

                return Err(error);
            }
        }
    }

    emit_workflow_event(&app, &WorkflowExecutionEvent {
        workflow_id: workflow.id.clone(),
        status: NodeStatus::Success,
    });

    Ok(())
}
