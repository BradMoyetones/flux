use tauri::AppHandle;
use tauri_plugin_store::StoreExt;
use serde_json::json;

use crate::state::{AppConfig, NotificationConfig};
use crate::storage::file_scanner::FluxEntry;
use crate::errors::AppError;

const STORE_PATH: &str = "user-settings.json";

pub fn load_config(app: &AppHandle) -> Result<AppConfig, String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;

    let is_first_time = store.get("isFirstTime").and_then(|v| v.as_bool()).unwrap_or(true);
    let user_name = store.get("userName").and_then(|v| v.as_str().map(|s| s.to_string())).unwrap_or_default();
    let theme = store.get("theme").and_then(|v| v.as_str().map(|s| s.to_string())).unwrap_or_else(|| "system".to_string());
    let avatar_path = store.get("avatarPath").and_then(|v| v.as_str().map(|s| s.to_string())).unwrap_or_default();
    let run_in_background = store.get("runInBackground").and_then(|v| v.as_bool()).unwrap_or(true);

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
    
    let workspaces = if let Some(val) = store.get("workspaces") {
        serde_json::from_value(val.clone()).unwrap_or_default()
    } else {
        Vec::new()
    };

    let workflow_index = if let Some(val) = store.get("workflow_index") {
        serde_json::from_value(val.clone()).unwrap_or_default()
    } else {
        Vec::new()
    };

    Ok(AppConfig {
        is_first_time,
        user_name,
        theme,
        avatar_path,
        run_in_background,
        notifications,
        variables,
        workspaces,
        workflow_index,
    })
}

pub fn save_config(app: &AppHandle, config: &AppConfig) -> Result<(), String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    store.set("isFirstTime", json!(config.is_first_time));
    store.set("userName", json!(config.user_name));
    store.set("theme", json!(config.theme));
    store.set("avatarPath", json!(config.avatar_path));
    store.set("runInBackground", json!(config.run_in_background));
    store.set("notifications", json!(config.notifications));
    store.set("variables", json!(config.variables));
    store.set("workspaces", json!(config.workspaces));
    store.set("workflow_index", json!(config.workflow_index));
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_run_in_background(app: &AppHandle) -> bool {
    app.store(STORE_PATH)
        .ok()
        .and_then(|store| store.get("runInBackground"))
        .and_then(|v| v.as_bool())
        .unwrap_or(true)
}

pub fn get_notification_config(app: &AppHandle) -> NotificationConfig {
    app.store(STORE_PATH)
        .ok()
        .and_then(|store| store.get("notifications"))
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

// ──── Workspaces ────

pub fn get_workspaces(app: &AppHandle) -> Result<Vec<String>, AppError> {
    let store = app.store(STORE_PATH).map_err(|e| AppError::Storage(e.to_string()))?;
    if let Some(val) = store.get("workspaces") {
        serde_json::from_value(val.clone()).map_err(|e| AppError::InvalidConfig(e.to_string()))
    } else {
        Ok(Vec::new())
    }
}

pub fn add_workspace(app: &AppHandle, path: String) -> Result<(), AppError> {
    let store = app.store(STORE_PATH).map_err(|e| AppError::Storage(e.to_string()))?;
    let mut workspaces = get_workspaces(app)?;
    if !workspaces.contains(&path) {
        workspaces.push(path);
        store.set("workspaces", json!(workspaces));
        store.save().map_err(|e| AppError::Storage(e.to_string()))?;
    }
    Ok(())
}

pub fn remove_workspace(app: &AppHandle, path: String) -> Result<(), AppError> {
    let store = app.store(STORE_PATH).map_err(|e| AppError::Storage(e.to_string()))?;

    // Quitar del listado de workspaces
    let mut workspaces = get_workspaces(app)?;
    workspaces.retain(|p| p != &path);
    store.set("workspaces", json!(workspaces));

    // Limpiar el índice
    let mut index = get_workflow_index(app)?;
    index.retain(|entry| entry.workspace != path);
    store.set("workflow_index", json!(index));

    store.save().map_err(|e| AppError::Storage(e.to_string()))?;
    Ok(())
}

// ──── Índice de Workflows ────

pub fn get_workflow_index(app: &AppHandle) -> Result<Vec<FluxEntry>, AppError> {
    let store = app.store(STORE_PATH).map_err(|e| AppError::Storage(e.to_string()))?;
    if let Some(val) = store.get("workflow_index") {
        serde_json::from_value(val.clone()).map_err(|e| AppError::InvalidConfig(e.to_string()))
    } else {
        Ok(Vec::new())
    }
}

pub fn set_workflow_index(app: &AppHandle, index: &[FluxEntry]) -> Result<(), AppError> {
    let store = app.store(STORE_PATH).map_err(|e| AppError::Storage(e.to_string()))?;
    store.set("workflow_index", json!(index));
    store.save().map_err(|e| AppError::Storage(e.to_string()))?;
    Ok(())
}

pub fn add_to_index(app: &AppHandle, entry: FluxEntry) -> Result<(), AppError> {
    let mut index = get_workflow_index(app)?;
    if !index.iter().any(|e| e.path == entry.path) {
        index.push(entry);
        set_workflow_index(app, &index)?;
    }
    Ok(())
}

pub fn remove_from_index(app: &AppHandle, path: &str) -> Result<(), AppError> {
    let mut index = get_workflow_index(app)?;
    index.retain(|e| e.path != path);
    set_workflow_index(app, &index)?;
    Ok(())
}
