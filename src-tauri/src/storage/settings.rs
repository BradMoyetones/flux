use serde::{Deserialize, Serialize};
use serde_json::json;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Wry};
use tauri_plugin_store::StoreExt;

const STORE_PATH: &str = ".app-settings.json";
const WORKSPACES_KEY: &str = "workspaces";

#[derive(Debug, Serialize, Deserialize)]
pub struct AppSettings {
    pub workspaces: Vec<String>,
}

pub fn get_workspaces(app: &AppHandle) -> Result<Vec<String>, String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    
    if let Some(workspaces_val) = store.get(WORKSPACES_KEY) {
        let workspaces: Vec<String> = serde_json::from_value(workspaces_val.clone())
            .map_err(|e| e.to_string())?;
        Ok(workspaces)
    } else {
        Ok(Vec::new())
    }
}

pub fn add_workspace(app: &AppHandle, path: String) -> Result<(), String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    
    let mut workspaces = get_workspaces(app)?;
    if !workspaces.contains(&path) {
        workspaces.push(path);
        store.set(WORKSPACES_KEY, json!(workspaces));
        store.save().map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

pub fn remove_workspace(app: &AppHandle, path: String) -> Result<(), String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    
    let mut workspaces = get_workspaces(app)?;
    workspaces.retain(|p| p != &path);
    store.set(WORKSPACES_KEY, json!(workspaces));
    store.save().map_err(|e| e.to_string())?;
    
    Ok(())
}
