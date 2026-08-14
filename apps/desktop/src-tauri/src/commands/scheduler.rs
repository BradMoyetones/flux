use tauri::{command, State};
use crate::models::workflow::Workflow;
use crate::state::AppState;
use std::sync::Arc;
use crate::errors::AppError;

#[command]
pub async fn cmd_schedule_workflow(
    state: State<'_, Arc<AppState>>,
    workflow: Workflow,
) -> Result<(), AppError> {
    state.scheduler.schedule_workflow(workflow).await
}

#[command]
pub async fn cmd_unschedule_workflow(
    state: State<'_, Arc<AppState>>,
    workflow_id: String,
) -> Result<(), AppError> {
    state.scheduler.unschedule_workflow(&workflow_id).await
}

#[command]
pub async fn cmd_list_scheduled(
    state: State<'_, Arc<AppState>>,
) -> Result<Vec<String>, AppError> {
    Ok(state.scheduler.list_scheduled().await)
}
