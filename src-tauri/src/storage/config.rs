use tauri::AppHandle;
use tauri_plugin_store::StoreExt;
use serde_json::json;

use crate::state::AppConfig;

const STORE_PATH: &str = ".app-settings.json";
const CONFIG_KEY: &str = "app_config";

pub fn load_config(app: &AppHandle) -> Result<AppConfig, String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;

    if let Some(val) = store.get(CONFIG_KEY) {
        serde_json::from_value(val.clone()).map_err(|e| e.to_string())
    } else {
        Ok(AppConfig::default())
    }
}

pub fn save_config(app: &AppHandle, config: &AppConfig) -> Result<(), String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    store.set(CONFIG_KEY, json!(config));
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}
