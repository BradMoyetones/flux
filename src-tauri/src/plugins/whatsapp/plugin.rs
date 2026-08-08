use async_trait::async_trait;
use serde_json::{json, Value};
use crate::core::context::ExecutionContext;
use crate::plugins::registry::NodePlugin;
use super::config::{WhatsAppNodeConfig, WhatsAppAction};

pub struct WhatsAppPlugin;

#[async_trait]
impl NodePlugin for WhatsAppPlugin {
    fn identifier(&self) -> &'static str {
        "whatsapp"
    }

    async fn execute(&self, ctx: &mut ExecutionContext, config: &Value) -> Result<Value, String> {
        let mut cfg: WhatsAppNodeConfig = serde_json::from_value(config.clone())
            .map_err(|e| format!("Config inválida para WhatsAppPlugin: {e}"))?;

        // 1. Fetch sidecar port from WhatsAppManager if not provided
        if cfg.sidecar_port.is_none() {
            let session_id = cfg.session_id.clone().unwrap_or_else(|| "default".to_string());
            use tauri::Manager;
            use crate::services::whatsapp_manager::WhatsAppManager;
            use std::sync::Arc;
            
            if let Some(state) = ctx.app.try_state::<Arc<WhatsAppManager>>() {
                if let Ok(port) = state.get_session_port(&session_id).await {
                    cfg.sidecar_port = Some(port);
                }
            }
        }

        match cfg.action {
            WhatsAppAction::SendMessage => {
                let phone = cfg.phone_number
                    .ok_or("Se requiere phoneNumber para enviar un mensaje")?;
                let message = cfg.message
                    .ok_or("Se requiere message para enviar un mensaje")?;

                if let Some(port) = cfg.sidecar_port {
                    let client = reqwest::Client::new();
                    let res = client.post(format!("http://127.0.0.1:{}/send-message", port))
                        .json(&json!({ "to": phone, "text": message }))
                        .send()
                        .await
                        .map_err(|e| format!("Failed to send request: {}", e))?;
                    
                    let data = res.json::<Value>().await
                        .map_err(|e| format!("Failed to parse response: {}", e))?;
                    Ok(data)
                } else {
                    Ok(json!({
                        "success": true,
                        "action": "send_message",
                        "to": phone,
                        "messagePreview": message.chars().take(100).collect::<String>(),
                        "messageId": format!("SIM_{}", uuid::Uuid::new_v4()),
                        "timestamp": chrono::Utc::now().to_rfc3339(),
                    }))
                }
            }
            WhatsAppAction::SendMedia => {
                let phone = cfg.phone_number
                    .ok_or("Se requiere phoneNumber para enviar media")?;
                let media_path = cfg.media_path
                    .ok_or("Se requiere mediaPath para enviar media")?;

                if let Some(port) = cfg.sidecar_port {
                    let client = reqwest::Client::new();
                    let res = client.post(format!("http://127.0.0.1:{}/send-media", port))
                        .json(&json!({ "to": phone, "mediaPath": media_path, "caption": cfg.media_caption.unwrap_or_default() }))
                        .send()
                        .await
                        .map_err(|e| format!("Failed to send request: {}", e))?;
                    
                    let data = res.json::<Value>().await
                        .map_err(|e| format!("Failed to parse response: {}", e))?;
                    Ok(data)
                } else {
                    Ok(json!({
                        "success": true,
                        "action": "send_media",
                        "to": phone,
                        "mediaPath": media_path,
                        "caption": cfg.media_caption.unwrap_or_default(),
                        "messageId": format!("SIM_{}", uuid::Uuid::new_v4()),
                        "timestamp": chrono::Utc::now().to_rfc3339(),
                    }))
                }
            }
            WhatsAppAction::GetChats => {
                if let Some(port) = cfg.sidecar_port {
                    let client = reqwest::Client::new();
                    let res = client.get(format!("http://127.0.0.1:{}/chats", port))
                        .send()
                        .await
                        .map_err(|e| format!("Failed to send request: {}", e))?;
                    
                    let data = res.json::<Value>().await
                        .map_err(|e| format!("Failed to parse response: {}", e))?;
                    Ok(data)
                } else {
                    Ok(json!({
                        "success": true,
                        "action": "get_chats",
                        "chats": [],
                        "totalCount": 0,
                    }))
                }
            }
            WhatsAppAction::GetMessages => {
                let chat_id = cfg.chat_id
                    .ok_or("Se requiere chatId para obtener mensajes")?;

                Ok(json!({
                    "success": true,
                    "action": "get_messages",
                    "chatId": chat_id,
                    "messages": [],
                    "limit": cfg.message_limit,
                }))
            }
            WhatsAppAction::GetContacts => {
                if let Some(port) = cfg.sidecar_port {
                    let client = reqwest::Client::new();
                    let res = client.get(format!("http://127.0.0.1:{}/contacts", port))
                        .send()
                        .await
                        .map_err(|e| format!("Failed to send request: {}", e))?;
                    
                    let data = res.json::<Value>().await
                        .map_err(|e| format!("Failed to parse response: {}", e))?;
                    Ok(data)
                } else {
                    Ok(json!({
                        "success": true,
                        "action": "get_contacts",
                        "contacts": [],
                    }))
                }
            }
            WhatsAppAction::GetGroupInfo => {
                let group_id = cfg.group_id
                    .ok_or("Se requiere groupId para obtener info del grupo")?;

                Ok(json!({
                    "success": true,
                    "action": "get_group_info",
                    "groupId": group_id,
                    "members": [],
                }))
            }
            WhatsAppAction::GetProfilePicture => {
                let phone = cfg.phone_number
                    .ok_or("Se requiere phoneNumber para obtener la foto de perfil")?;

                Ok(json!({
                    "success": true,
                    "action": "get_profile_picture",
                    "phone": phone,
                    "pictureUrl": null,
                }))
            }
        }
    }
}
