use tauri::AppHandle;
use tauri_plugin_store::StoreExt;
use serde_json::json;

use crate::state::{AppConfig, GeneralConfig, NotificationConfig};

const STORE_PATH: &str = "user-settings.json";

pub fn load_config(app: &AppHandle) -> Result<AppConfig, String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;

    let general = GeneralConfig {
        run_in_background: store
            .get("runInBackground")
            .and_then(|v| v.as_bool())
            .unwrap_or(true),
    };

    let notifications = if let Some(val) = store.get("notifications") {
        serde_json::from_value(val.clone()).unwrap_or_default()
    } else {
        NotificationConfig::default()
    };

    let variables = if let Some(val) = store.get("variables") {
        serde_json::from_value(val.clone()).unwrap_or_default()
    } else {
        Vec::new()
    };

    Ok(AppConfig {
        general,
        notifications,
        variables,
    })
}

pub fn save_config(app: &AppHandle, config: &AppConfig) -> Result<(), String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    store.set("runInBackground", json!(config.general.run_in_background));
    store.set("notifications", json!(config.notifications));
    store.set("variables", json!(config.variables));
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}
