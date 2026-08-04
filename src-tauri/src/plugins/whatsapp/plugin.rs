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

    async fn execute(&self, _ctx: &mut ExecutionContext, config: &Value) -> Result<Value, String> {
        let cfg: WhatsAppNodeConfig = serde_json::from_value(config.clone())
            .map_err(|e| format!("Config inválida para WhatsAppPlugin: {e}"))?;

        match cfg.action {
            WhatsAppAction::SendMessage => {
                let phone = cfg.phone_number
                    .ok_or("Se requiere phoneNumber para enviar un mensaje")?;
                let message = cfg.message
                    .ok_or("Se requiere message para enviar un mensaje")?;

                // TODO: Integrar SDK de WhatsApp real (whatsapp-rs o API de WhatsApp Business).
                // Por ahora retornamos un resultado simulado para validar el flujo completo.
                Ok(json!({
                    "success": true,
                    "action": "send_message",
                    "to": phone,
                    "messagePreview": message.chars().take(100).collect::<String>(),
                    "messageId": format!("SIM_{}", uuid::Uuid::new_v4()),
                    "timestamp": chrono::Utc::now().to_rfc3339(),
                }))
            }
            WhatsAppAction::SendMedia => {
                let phone = cfg.phone_number
                    .ok_or("Se requiere phoneNumber para enviar media")?;
                let media_path = cfg.media_path
                    .ok_or("Se requiere mediaPath para enviar media")?;

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
            WhatsAppAction::GetChats => {
                Ok(json!({
                    "success": true,
                    "action": "get_chats",
                    "chats": [],
                    "totalCount": 0,
                }))
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
                Ok(json!({
                    "success": true,
                    "action": "get_contacts",
                    "contacts": [],
                }))
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
