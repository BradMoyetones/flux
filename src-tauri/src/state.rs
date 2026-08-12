use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;
use std::sync::Mutex;
use tokio::task::JoinHandle;

use crate::services::whatsapp_manager::WhatsAppManager;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GeneralConfig {
    pub run_in_background: bool,
}

impl Default for GeneralConfig {
    fn default() -> Self {
        Self {
            run_in_background: true,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NotificationConfig {
    pub desktop_enabled: bool,
    pub on_flow_success: bool,
    pub on_flow_error: bool,
    pub on_session_disconnect: bool,
    pub sound: bool,
    pub quiet_hours: bool,
}

impl Default for NotificationConfig {
    fn default() -> Self {
        Self {
            desktop_enabled: true,
            on_flow_success: true,
            on_flow_error: true,
            on_session_disconnect: true,
            sound: true,
            quiet_hours: false,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GlobalVariable {
    pub key: String,
    pub value: String,
    pub secret: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub general: GeneralConfig,
    pub notifications: NotificationConfig,
    pub variables: Vec<GlobalVariable>,
}

pub struct AppState {
    pub wa_manager: Arc<WhatsAppManager>,
    pub config: Arc<RwLock<AppConfig>>,
    pub scheduler: Arc<crate::services::scheduler::SchedulerService>,
    pub active_executions: Mutex<HashMap<String, JoinHandle<()>>>,
}
