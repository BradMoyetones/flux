use tauri::{command, AppHandle, State};
use crate::state::AppState;
use serde_json::Value;
use std::sync::Arc;
use crate::errors::AppError;

#[command]
pub async fn cmd_wa_start_session(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    session_id: String,
) -> Result<Value, AppError> {
    let info = state.wa_manager.start_session(&app, &session_id).await?;
    Ok(serde_json::to_value(info).unwrap())
}

#[command]
pub async fn cmd_wa_stop_session(
    state: State<'_, Arc<AppState>>,
    session_id: String,
) -> Result<(), AppError> {
    state.wa_manager.stop_session(&session_id).await
}

#[command]
pub async fn cmd_wa_delete_session(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    session_id: String,
) -> Result<(), AppError> {
    state.wa_manager.delete_session(&app, &session_id).await
}

#[command]
pub async fn cmd_wa_list_sessions(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
) -> Result<Value, AppError> {
    let sessions = state.wa_manager.list_sessions(&app).await;
    Ok(serde_json::to_value(sessions).unwrap())
}

#[command]
pub async fn cmd_wa_get_status(
    state: State<'_, Arc<AppState>>,
    session_id: String,
) -> Result<Value, AppError> {
    state.wa_manager.send_request(&session_id, "GET", "/status", None).await
}

#[command]
pub async fn cmd_wa_get_qr_url(
    state: State<'_, Arc<AppState>>,
    session_id: String,
) -> Result<String, AppError> {
    let port = state.wa_manager.get_session_port(&session_id).await?;
    Ok(format!("http://127.0.0.1:{}/qr", port))
}

#[command]
pub async fn cmd_wa_proxy_request(
    state: State<'_, Arc<AppState>>,
    session_id: String,
    method: String,
    path: String,
    body: Option<Value>,
) -> Result<Value, AppError> {
    state.wa_manager.send_request(&session_id, &method, &path, body.as_ref()).await
}
