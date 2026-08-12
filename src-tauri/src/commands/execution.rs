use tauri::{AppHandle, command, Manager};
use std::sync::Arc;
use crate::models::workflow::Workflow;
use crate::core::executor::execute_workflow;
use crate::state::AppState;

#[command]
pub async fn cmd_execute_workflow(app: AppHandle, workflow: Workflow) -> Result<(), String> {
    let workflow_id = workflow.id.clone();
    let app_clone = app.clone();
    let inner_workflow_id = workflow_id.clone();
    
    // Spawn en tokio para no bloquear el hilo principal de Tauri
    let handle = tokio::spawn(async move {
        let _ = execute_workflow(app_clone.clone(), workflow).await;
        
        // Limpiar al terminar
        if let Some(state) = app_clone.try_state::<Arc<AppState>>() {
            state.active_executions.lock().unwrap().remove(&inner_workflow_id);
        }
    });
    
    // Almacenar el handle para permitir cancelación
    if let Some(state) = app.try_state::<Arc<AppState>>() {
        state.active_executions.lock().unwrap().insert(workflow_id.clone(), handle);
    }
    
    Ok(())
}

#[command]
pub async fn cmd_stop_workflow(app: AppHandle, workflow_id: String) -> Result<(), String> {
    if let Some(state) = app.try_state::<Arc<AppState>>() {
        if let Some(handle) = state.active_executions.lock().unwrap().remove(&workflow_id) {
            handle.abort();
            
            // Emitir evento de cancelación para que la UI se entere
            use crate::core::events::emit_workflow_event;
            use crate::models::runtime::{WorkflowExecutionEvent, NodeStatus};
            emit_workflow_event(&app, &WorkflowExecutionEvent {
                workflow_id,
                status: NodeStatus::Error, // Podríamos añadir NodeStatus::Cancelled, pero Error funciona por ahora
            });
            
            return Ok(());
        }
    }
    Err("Workflow no encontrado o no está en ejecución".to_string())
}
