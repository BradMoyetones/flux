use tauri::State;

use crate::engine::executor::WorkflowExecutor;
use crate::errors::AppError;
use crate::models::execution::{ExecutionResult, ExecutionStatus};
use crate::state::AppState;

#[tauri::command]
pub async fn run_workflow(
    state: State<'_, AppState>,
    workflow_id: String,
) -> Result<ExecutionResult, AppError> {
    let workflows = state.workflows.lock().await;
    let workflow = workflows
        .get(&workflow_id)
        .ok_or_else(|| AppError::WorkflowNotFound(workflow_id.clone()))?
        .clone();
    drop(workflows);

    // Ejecutar el workflow
    let result = WorkflowExecutor::execute(&workflow).await;
    Ok(result)
}

#[tauri::command]
pub async fn stop_workflow(
    _state: State<'_, AppState>,
    _execution_id: String,
) -> Result<(), AppError> {
    // TODO: Implementar lógica para cancelar una ejecución en progreso
    Ok(())
}

#[tauri::command]
pub async fn get_execution_status(
    _state: State<'_, AppState>,
    _execution_id: String,
) -> Result<ExecutionStatus, AppError> {
    // TODO: Implementar lógica para obtener estado de una ejecución
    Ok(ExecutionStatus::Running)
}
