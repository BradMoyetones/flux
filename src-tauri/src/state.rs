use std::sync::Arc;
use crate::services::whatsapp_manager::WhatsAppManager;

pub struct AppState {
    pub wa_manager: Arc<WhatsAppManager>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            wa_manager: Arc::new(WhatsAppManager::new()),
        }
    }
}
