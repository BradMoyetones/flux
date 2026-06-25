use std::collections::HashMap;

use tokio::sync::Mutex;

use crate::models::workflow::Workflow;
use crate::services::whatsapp_client::WhatsAppCore;
// use crate::services::http_client::HttpClient;

pub struct AppState {
    pub workflows: Mutex<HashMap<String, Workflow>>,
    pub wa_client: Mutex<WhatsAppCore>,
    // pub http_client: HttpClient,
}
