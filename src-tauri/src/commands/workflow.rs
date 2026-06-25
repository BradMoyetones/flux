use tauri::State;

use crate::errors::AppError;
use crate::models::workflow::Workflow;
use crate::state::AppState;

#[tauri::command]
pub async fn create_workflow(
    state: State<'_, AppState>,
    workflow: Workflow,
) -> Result<Workflow, AppError> {
    let mut workflows = state.workflows.lock().await;
    workflows.insert(workflow.id.clone(), workflow.clone());
    Ok(workflow)
}

#[tauri::command]
pub async fn update_workflow(
    state: State<'_, AppState>,
    workflow: Workflow,
) -> Result<Workflow, AppError> {
    let mut workflows = state.workflows.lock().await;
    if !workflows.contains_key(&workflow.id) {
        return Err(AppError::WorkflowNotFound(workflow.id));
    }
    workflows.insert(workflow.id.clone(), workflow.clone());
    Ok(workflow)
}

#[tauri::command]
pub async fn delete_workflow(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    let mut workflows = state.workflows.lock().await;
    if workflows.remove(&id).is_none() {
        return Err(AppError::WorkflowNotFound(id));
    }
    Ok(())
}

#[tauri::command]
pub async fn list_workflows(state: State<'_, AppState>) -> Result<Vec<Workflow>, AppError> {
    let workflows = state.workflows.lock().await;
    Ok(workflows.values().cloned().collect())
}

#[tauri::command]
pub async fn get_workflow(state: State<'_, AppState>, id: String) -> Result<Workflow, AppError> {
    let workflows = state.workflows.lock().await;
    workflows
        .get(&id)
        .cloned()
        .ok_or_else(|| AppError::WorkflowNotFound(id))
}
