use async_trait::async_trait;
use serde_json::{json, Value};
use crate::core::context::ExecutionContext;
use crate::plugins::registry::NodePlugin;
use super::config::{WhatsAppNodeConfig, WhatsAppAction};

pub struct WhatsAppPlugin;

async fn parse_wa_response(res: reqwest::Response, context: &str) -> Result<Value, String> {
    let status = res.status();
    if !status.is_success() {
        let text = res.text().await.unwrap_or_else(|_| "Error desconocido (sin cuerpo)".into());
        return Err(format!("{} falló con HTTP {}: {}", context, status, text));
    }
    res.json::<Value>().await.map_err(|e| format!("Error parseando JSON de {}: {}", context, e))
}

#[async_trait]
impl NodePlugin for WhatsAppPlugin {
    fn identifier(&self) -> &'static str {
        "whatsapp"
    }

    async fn execute(&self, ctx: &ExecutionContext, config: &Value) -> Result<Value, String> {
        let mut cfg: WhatsAppNodeConfig = serde_json::from_value(config.clone())
            .map_err(|e| format!("Config inválida para WhatsAppPlugin: {e}"))?;

        // 1. Fetch sidecar port from WhatsAppManager via AppState
        if cfg.sidecar_port.is_none() {
            let session_id = cfg.session_id.clone().unwrap_or_else(|| "default".to_string());
            use tauri::Manager;
            use crate::state::AppState;
            use std::sync::Arc;
            
            if let Some(state) = ctx.app.try_state::<Arc<AppState>>() {
                // Auto-start session if not running
                match state.wa_manager.start_session(&ctx.app, &session_id).await {
                    Ok(info) => {
                        cfg.sidecar_port = Some(info.port);
                        // Verify the session is actually connected before sending
                        if !info.connected {
                            // Give it a moment to connect if it was just started
                            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                        }
                    }
                    Err(e) => {
                        return Err(format!("No se pudo iniciar la sesión WhatsApp '{}': {}", session_id, e));
                    }
                }
            } else {
                return Err("AppState no disponible en el contexto de ejecución".to_string());
            }
        }

        let port = cfg.sidecar_port
            .ok_or("No se pudo obtener el puerto del sidecar WhatsApp. ¿La sesión está activa?")?;
        let client = reqwest::Client::new();
        let base = format!("http://127.0.0.1:{}", port);

        match cfg.action {
            WhatsAppAction::SendMessage => {
                let phone = cfg.phone_number
                    .ok_or("Se requiere phoneNumber para enviar un mensaje")?;
                let message = cfg.message
                    .ok_or("Se requiere message para enviar un mensaje")?;

                let res = client.post(format!("{}/send-message", base))
                    .json(&json!({ "to": phone, "text": message }))
                    .send()
                    .await
                    .map_err(|e| format!("Error en request: {}", e))?;
                
                parse_wa_response(res, "send-message").await
            }
            WhatsAppAction::SendMedia => {
                let phone = cfg.phone_number
                    .ok_or("Se requiere phoneNumber para enviar media")?;
                let media_path = cfg.media_path
                    .ok_or("Se requiere mediaPath para enviar media")?;

                let res = client.post(format!("{}/send-media", base))
                    .json(&json!({ "to": phone, "mediaPath": media_path, "caption": cfg.media_caption.unwrap_or_default() }))
                    .send()
                    .await
                    .map_err(|e| format!("Error en request: {}", e))?;
                
                parse_wa_response(res, "send-media").await
            }
            WhatsAppAction::GetChats => {
                let res = client.get(format!("{}/chats", base))
                    .send()
                    .await
                    .map_err(|e| format!("Error en request: {}", e))?;
                
                parse_wa_response(res, "get-chats").await
            }
            WhatsAppAction::GetMessages => {
                let chat_id = cfg.chat_id
                    .ok_or("Se requiere chatId para obtener mensajes")?;

                // TODO: implement /messages endpoint in Go sidecar
                Ok(json!({
                    "action": "get_messages",
                    "chatId": chat_id,
                    "messages": [],
                    "limit": cfg.message_limit,
                    "note": "Endpoint pendiente de implementación en sidecar"
                }))
            }
            WhatsAppAction::GetContacts => {
                let res = client.get(format!("{}/contacts", base))
                    .send()
                    .await
                    .map_err(|e| format!("Error en request: {}", e))?;
                
                parse_wa_response(res, "get-contacts").await
            }
            WhatsAppAction::GetGroupInfo => {
                let _group_id = cfg.group_id
                    .ok_or("Se requiere groupId para obtener info del grupo")?;

                // Use the /groups endpoint
                let res = client.get(format!("{}/groups", base))
                    .send()
                    .await
                    .map_err(|e| format!("Error en request: {}", e))?;
                
                parse_wa_response(res, "get-groups").await
            }
            WhatsAppAction::GetProfilePicture => {
                let phone = cfg.phone_number
                    .ok_or("Se requiere phoneNumber para obtener la foto de perfil")?;

                let res = client.get(format!("{}/profile-pic?jid={}", base, phone))
                    .send()
                    .await
                    .map_err(|e| format!("Error en request: {}", e))?;
                
                parse_wa_response(res, "get-profile-pic").await
            }
        }
    }
}
