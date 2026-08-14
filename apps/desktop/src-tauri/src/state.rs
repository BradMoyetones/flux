use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;
use std::sync::Mutex;
use tokio::task::JoinHandle;

use crate::services::whatsapp_manager::WhatsAppManager;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NotificationConfig {
    pub desktop_enabled: bool,
    pub on_flow_success: bool,
    pub on_flow_error: bool,
    pub on_session_disconnect: bool,
    pub sound: bool,
    pub quiet_hours: bool,
    pub only_when_unfocused: bool,
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
            only_when_unfocused: true,
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

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub is_first_time: bool,
    pub user_name: String,
    pub theme: String,
    pub avatar_path: String,
    pub run_in_background: bool,
    pub notifications: NotificationConfig,
    pub variables: Vec<GlobalVariable>,
    pub workspaces: Vec<String>,
    pub workflow_index: Vec<crate::storage::file_scanner::FluxEntry>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            is_first_time: true,
            user_name: String::new(),
            theme: "system".to_string(),
            avatar_path: String::new(),
            run_in_background: true,
            notifications: NotificationConfig::default(),
            variables: Vec::new(),
            workspaces: Vec::new(),
            workflow_index: Vec::new(),
        }
    }
}

pub struct AppState {
    pub wa_manager: Arc<WhatsAppManager>,
    pub config: Arc<RwLock<AppConfig>>,
    pub scheduler: Arc<crate::services::scheduler::SchedulerService>,
    pub active_executions: Mutex<HashMap<String, JoinHandle<()>>>,
}
