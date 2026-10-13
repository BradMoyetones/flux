use std::sync::Arc;
use tauri::{command, State};

use crate::errors::AppError;
use crate::state::AppState;
use crate::storage::db::{RunDetail, RunRecord};

/// Historial de ejecuciones, más recientes primero. `workflow_id` filtra por flujo.
#[command]
pub async fn cmd_list_runs(
    state: State<'_, Arc<AppState>>,
    workflow_id: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<RunRecord>, AppError> {
    state.db.list_runs(workflow_id.as_deref(), limit.unwrap_or(50).min(500))
}

/// Detalle de un run con el estado de cada nodo.
#[command]
pub async fn cmd_get_run(state: State<'_, Arc<AppState>>, run_id: String) -> Result<Option<RunDetail>, AppError> {
    state.db.get_run(&run_id)
}

/// Borra el historial (los runs en curso se conservan). Devuelve cuántos se borraron.
#[command]
pub async fn cmd_clear_runs(state: State<'_, Arc<AppState>>, workflow_id: Option<String>) -> Result<usize, AppError> {
    state.db.clear_runs(workflow_id.as_deref())
}
