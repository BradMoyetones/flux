use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::collections::HashMap;
use std::sync::Mutex;
use std::sync::atomic::AtomicBool;

use crate::plugins::registry::PluginRegistry;
use crate::services::whatsapp_manager::WhatsAppManager;
use crate::storage::config::ConfigService;

/// Zona horaria por defecto cuando el usuario no ha elegido ninguna.
pub const DEFAULT_TIMEZONE: &str = "America/Bogota";

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", default)]
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

/// Configuración global de la app. **Única fuente de verdad**: vive en Rust
/// (`ConfigService`) y el frontend solo la lee / la modifica con `cmd_patch_config`.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub is_first_time: bool,
    pub user_name: String,
    pub theme: String,
    pub avatar_path: String,
    /// Mantener la app viva en el System Tray al cerrar la ventana.
    pub run_in_background: bool,
    /// Iniciar Flux automáticamente con el sistema (necesario para que los crons corran).
    pub autostart: bool,
    /// Zona horaria IANA por defecto para triggers cron (ej. "America/Bogota").
    pub timezone: String,
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
            autostart: true,
            timezone: DEFAULT_TIMEZONE.to_string(),
            notifications: NotificationConfig::default(),
            variables: Vec::new(),
            workspaces: Vec::new(),
            workflow_index: Vec::new(),
        }
    }
}

/// Cambios parciales que el frontend puede aplicar a la config. Los workspaces y el
/// índice NO están aquí a propósito: tienen sus propios comandos y el frontend nunca
/// debe poder sobrescribirlos en bloque.
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ConfigPatch {
    pub is_first_time: Option<bool>,
    pub user_name: Option<String>,
    pub theme: Option<String>,
    pub avatar_path: Option<String>,
    pub run_in_background: Option<bool>,
    pub autostart: Option<bool>,
    pub timezone: Option<String>,
    pub notifications: Option<NotificationConfig>,
    pub variables: Option<Vec<GlobalVariable>>,
}

/// Una ejecución en curso (manual o programada).
pub struct ActiveRun {
    pub run_id: String,
    pub handle: tauri::async_runtime::JoinHandle<()>,
}

/// Estado del arranque (splashscreen).
pub struct StartupState {
    /// La app se lanzó con `--minimized` (autostart): no mostrar la ventana principal.
    pub start_minimized: bool,
    /// Ya se hizo la transición splash → main (evita re-mostrar la ventana tarde).
    pub done: AtomicBool,
}

pub struct AppState {
    pub wa_manager: Arc<WhatsAppManager>,
    pub config: Arc<ConfigService>,
    pub scheduler: Arc<crate::services::scheduler::SchedulerService>,
    pub registry: Arc<PluginRegistry>,
    pub active_executions: Mutex<HashMap<String, ActiveRun>>,
}
