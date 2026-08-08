use tauri::{command, AppHandle, State};
use crate::services::whatsapp_manager::WhatsAppManager;
use serde_json::Value;
use std::sync::Arc;

#[command]
pub async fn cmd_wa_start_session(
    app: AppHandle,
    state: State<'_, Arc<WhatsAppManager>>,
    session_id: String,
) -> Result<Value, String> {
    let info = state.start_session(&app, &session_id).await?;
    Ok(serde_json::to_value(info).unwrap())
}

#[command]
pub async fn cmd_wa_stop_session(
    state: State<'_, Arc<WhatsAppManager>>,
    session_id: String,
) -> Result<(), String> {
    state.stop_session(&session_id).await
}

#[command]
pub async fn cmd_wa_list_sessions(
    state: State<'_, Arc<WhatsAppManager>>,
) -> Result<Value, String> {
    let sessions = state.list_sessions().await;
    Ok(serde_json::to_value(sessions).unwrap())
}

#[command]
pub async fn cmd_wa_get_status(
    state: State<'_, Arc<WhatsAppManager>>,
    session_id: String,
) -> Result<Value, String> {
    state.send_request(&session_id, "GET", "/status", None).await
}

#[command]
pub async fn cmd_wa_get_qr_url(
    state: State<'_, Arc<WhatsAppManager>>,
    session_id: String,
) -> Result<String, String> {
    let port = state.get_session_port(&session_id).await?;
    Ok(format!("http://127.0.0.1:{}/qr", port))
}

#[command]
pub async fn cmd_wa_proxy_request(
    state: State<'_, Arc<WhatsAppManager>>,
    session_id: String,
    method: String,
    path: String,
    body: Option<Value>,
) -> Result<Value, String> {
    state.send_request(&session_id, &method, &path, body.as_ref()).await
}
