use tauri::{AppHandle, command};
use std::sync::Arc;
use crate::models::workflow::Workflow;
use crate::core::runs;
use crate::errors::AppError;
use crate::state::AppState;

#[command]
pub async fn cmd_execute_workflow(app: AppHandle, workflow: Workflow) -> Result<(), AppError> {
    runs::start_run(&app, workflow, "manual")
}

/// Detiene el run en curso. Idempotente: si no hay nada ejecutándose devuelve Ok.
#[command]
pub async fn cmd_stop_workflow(app: AppHandle, workflow_id: String) -> Result<(), AppError> {
    runs::stop_run(&app, &workflow_id)?;
    Ok(())
}

#[derive(serde::Serialize)]
pub struct ActiveWorkflowsResponse {
    pub executing: Vec<String>,
    pub scheduled: Vec<String>,
}

#[command]
pub async fn cmd_get_active_workflows(state: tauri::State<'_, Arc<AppState>>) -> Result<ActiveWorkflowsResponse, AppError> {
    let executing: Vec<String> = state
        .active_executions
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .keys()
        .cloned()
        .collect();
    let scheduled: Vec<String> = state.scheduler.list_scheduled().await;

    Ok(ActiveWorkflowsResponse { executing, scheduled })
}
