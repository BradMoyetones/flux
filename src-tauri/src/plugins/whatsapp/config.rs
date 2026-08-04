use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WhatsAppNodeConfig {
    pub action: WhatsAppAction,

    // ──── Envío ────
    /// Número de teléfono destino con código de país (ej: "+573001234567").
    /// Soporta interpolación: "{{node1.data.body.phone}}"
    pub phone_number: Option<String>,
    /// Contenido del mensaje (soporta interpolación).
    pub message: Option<String>,
    /// Ruta a un archivo para enviar como adjunto.
    pub media_path: Option<String>,
    /// Caption del archivo adjunto.
    pub media_caption: Option<String>,

    // ──── Lectura ────
    /// ID del chat para acciones de lectura.
    pub chat_id: Option<String>,
    /// Límite de mensajes/chats a obtener. Default: 50.
    #[serde(default = "default_limit")]
    pub message_limit: u32,

    // ──── Grupo ────
    /// ID del grupo para acciones de grupo.
    pub group_id: Option<String>,

    // ──── Filtros ────
    /// Filtrar por contacto (nombre o número).
    pub filter_contact: Option<String>,
    /// Filtrar por fecha desde (ISO 8601).
    pub filter_from_date: Option<String>,
    /// Filtrar por fecha hasta (ISO 8601).
    pub filter_to_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum WhatsAppAction {
    SendMessage,
    SendMedia,
    GetChats,
    GetMessages,
    GetContacts,
    GetGroupInfo,
    GetProfilePicture,
}

fn default_limit() -> u32 { 50 }
