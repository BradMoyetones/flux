use std::sync::{Arc, Mutex};
use petgraph::graphmap::DiGraphMap;
use petgraph::algo::toposort;
use crate::models::workflow::Workflow;
use crate::core::context::ExecutionContext;
use crate::core::events::{emit_node_event, emit_workflow_event};
use crate::core::interpolator::interpolate_value;
use crate::core::logger::{log_info, log_warn, log_error, log_debug};
use crate::models::runtime::{NodeExecutionEvent, NodeStatus, WorkflowExecutionEvent};
use crate::storage::file_scanner::touch_workflow_metadata;
use tauri::{AppHandle, Manager, Emitter};
use std::collections::HashMap;
use tokio::sync::watch;
use tokio::task::JoinSet;
use crate::errors::AppError;

type StatusMap = Arc<Mutex<HashMap<String, NodeStatus>>>;

/// Registra el estado de un nodo y lo emite al frontend (un único punto para ambos).
fn report_node(
    app: &AppHandle,
    statuses: &StatusMap,
    workflow_id: &str,
    node_id: &str,
    status: NodeStatus,
    result: Option<serde_json::Value>,
    error: Option<String>,
) {
    if let Ok(mut map) = statuses.lock() {
        map.insert(node_id.to_string(), status.clone());
    }
    emit_node_event(app, &NodeExecutionEvent {
        workflow_id: workflow_id.to_string(),
        node_id: node_id.to_string(),
        status,
        result,
        error,
    });
}

/// Centinela de la ejecución. Si el run se aborta (`JoinHandle::abort()` al pulsar
/// Stop) el future se descarta y este `Drop` marca como `cancelled` todos los nodos
/// que seguían `pending`/`running`, para que la UI nunca quede con nodos "corriendo".
struct RunGuard {
    app: AppHandle,
    workflow_id: String,
    statuses: StatusMap,
    finished: bool,
}

impl Drop for RunGuard {
    fn drop(&mut self) {
        if self.finished {
            return;
        }
        let pending: Vec<String> = self
            .statuses
            .lock()
            .map(|m| {
                m.iter()
                    .filter(|(_, s)| matches!(s, NodeStatus::Pending | NodeStatus::Running))
                    .map(|(id, _)| id.clone())
                    .collect()
            })
            .unwrap_or_default();

        for node_id in pending {
            emit_node_event(&self.app, &NodeExecutionEvent {
                workflow_id: self.workflow_id.clone(),
                node_id,
                status: NodeStatus::Cancelled,
                result: None,
                error: None,
            });
        }
        emit_workflow_event(&self.app, &WorkflowExecutionEvent {
            workflow_id: self.workflow_id.clone(),
            status: NodeStatus::Cancelled,
        });
        log_warn(&self.app, &self.workflow_id, None, "⏹ Ejecución cancelada");
    }
}

pub async fn execute_workflow(app: AppHandle, workflow: Workflow) -> Result<(), AppError> {
    log_info(&app, &workflow.id, None, &format!("▶ Iniciando workflow '{}' ({} nodos)", workflow.name, workflow.nodes.len()));
    let workflow_name_clone = workflow.name.clone();
    let (registry, custom_variables) = {
        let state = app
            .try_state::<Arc<crate::state::AppState>>()
            .ok_or_else(|| AppError::Internal("AppState no disponible".into()))?;
        (Arc::clone(&state.registry), state.config.read(|c| c.variables.clone()))
    };

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
    let ctx = Arc::new(ExecutionContext::new(app.clone(), custom_variables));

    let statuses: StatusMap = Arc::new(Mutex::new(
        workflow.nodes.iter().map(|n| (n.id.clone(), NodeStatus::Pending)).collect(),
    ));
    let mut guard = RunGuard {
        app: app.clone(),
        workflow_id: workflow.id.clone(),
        statuses: Arc::clone(&statuses),
        finished: false,
    };

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
        let statuses_clone = Arc::clone(&statuses);
        let workflow_id = workflow.id.clone();

        join_set.spawn(async move {
            // Esperar a los padres
            for mut rx in parent_rxs {
                while rx.borrow().is_none() {
                    if rx.changed().await.is_err() {
                        // El padre fue destruido inesperadamente
                        let _ = tx.send(Some(false));
                        report_node(&app_clone, &statuses_clone, &workflow_id, &node.id, NodeStatus::Skipped, None, Some("La dependencia no terminó".into()));
                        return Err(AppError::Internal(format!("Dependencia falló o fue cancelada para el nodo '{}'", node_id)));
                    }
                }
                if *rx.borrow() == Some(false) {
                    log_warn(&app_clone, &workflow_id, Some(&node.id), &format!("⊘ Nodo '{}' omitido: una dependencia falló", node.label));
                    report_node(&app_clone, &statuses_clone, &workflow_id, &node.id, NodeStatus::Skipped, None, Some("Omitido: un nodo previo falló".into()));
                    let _ = tx.send(Some(false));
                    return Err(AppError::StepExecution { step_id: node.id.clone(), message: "Omitido: un nodo padre falló".into() });
                }
            }

            log_info(&app_clone, &workflow_id, Some(&node.id), &format!("▶ Ejecutando nodo '{}' ({})", node.label, node.node_type));
            report_node(&app_clone, &statuses_clone, &workflow_id, &node.id, NodeStatus::Running, None, None);

            // Interpolar config (falla el nodo si alguna expresión no se puede resolver)
            let interpolated_config = match interpolate_value(&node.config, &ctx_clone) {
                Ok(v) => v,
                Err(error) => {
                    log_error(&app_clone, &workflow_id, Some(&node.id), &format!("✗ Nodo '{}' falló al resolver expresiones: {}", node.label, error), None);
                    report_node(&app_clone, &statuses_clone, &workflow_id, &node.id, NodeStatus::Error, None, Some(error.clone()));
                    let _ = tx.send(Some(false));
                    return Err(AppError::StepExecution { step_id: node.id.clone(), message: error });
                }
            };

            // Buscar plugin
            match registry_clone.get(&node.node_type) {
                Some(plugin) => {
                    match plugin.execute(&ctx_clone, &interpolated_config).await {
                        Ok(result) => {
                            ctx_clone.set_node_result(&node.id, result.clone());
                            if !node.name.is_empty() {
                                ctx_clone.set_node_result(&node.name, result.clone());
                            }

                            report_node(&app_clone, &statuses_clone, &workflow_id, &node.id, NodeStatus::Success, Some(result.clone()), None);

                            log_info(&app_clone, &workflow_id, Some(&node.id), &format!("✓ Nodo '{}' completado", node.label));
                            log_debug(&app_clone, &workflow_id, Some(&node.id), &result.to_string());
                            let _ = tx.send(Some(true));
                            Ok(())
                        }
                        Err(error) => {
                            report_node(&app_clone, &statuses_clone, &workflow_id, &node.id, NodeStatus::Error, None, Some(error.clone()));
                            log_error(&app_clone, &workflow_id, Some(&node.id), &format!("✗ Nodo '{}' falló: {}", node.label, error), None);
                            let _ = tx.send(Some(false));
                            Err(AppError::StepExecution { step_id: node.id.clone(), message: format!("Nodo falló: {}", error) })
                        }
                    }
                }
                None => {
                    let error = format!("Plugin '{}' no registrado", node.node_type);
                    log_error(&app_clone, &workflow_id, Some(&node.id), &format!("✗ {}", error), None);
                    report_node(&app_clone, &statuses_clone, &workflow_id, &node.id, NodeStatus::Error, None, Some(error.clone()));
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

    // El run terminó por sí mismo (éxito o fallo): ya no es una cancelación.
    guard.finished = true;

    let outcome = if workflow_failed {
        let err_obj = first_error.unwrap_or_else(|| AppError::Internal("Error desconocido".into()));
        let err_msg = err_obj.to_string();

        log_error(&app, &workflow.id, None, &format!("✗ Workflow '{}' falló: {}", workflow_name_clone, err_msg), None);
        emit_workflow_event(&app, &WorkflowExecutionEvent {
            workflow_id: workflow.id.clone(),
            status: NodeStatus::Error,
        });
        let _ = crate::services::notifications::notify_flow_error(&app, &workflow_name_clone, &err_msg);
        Err(err_obj)
    } else {
        log_info(&app, &workflow.id, None, &format!("✓ Workflow '{}' completado exitosamente", workflow_name_clone));
        emit_workflow_event(&app, &WorkflowExecutionEvent {
            workflow_id: workflow.id.clone(),
            status: NodeStatus::Success,
        });
        let _ = crate::services::notifications::notify_flow_success(&app, &workflow_name_clone);
        Ok(())
    };

    // Estadísticas de ejecución. IMPORTANTE: se actualizan sobre el archivo que hay
    // AHORA en disco (solo `metadata`), nunca re-escribiendo el snapshot con el que
    // arrancó el run — así no se pisan ediciones guardadas mientras corría.
    if let Some(path) = workflow.path.clone() {
        let workflow_id = workflow.id.clone();
        let updated = tauri::async_runtime::spawn_blocking(move || touch_workflow_metadata(&path, &workflow_id).map(|m| (path, m)))
            .await
            .ok()
            .flatten();

        if let Some((path, meta)) = updated {
            let _ = app.emit("workflow://metadata-updated", serde_json::json!({
                "path": path,
                "metadata": meta,
            }));
        }
    }

    outcome
}
