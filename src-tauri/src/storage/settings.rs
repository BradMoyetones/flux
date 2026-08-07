use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;
use crate::storage::file_scanner::FluxEntry;

const STORE_PATH: &str = ".app-settings.json";
const WORKSPACES_KEY: &str = "workspaces";
const INDEX_KEY: &str = "workflow_index";

// ──── Workspaces ────

pub fn get_workspaces(app: &AppHandle) -> Result<Vec<String>, String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;

    if let Some(val) = store.get(WORKSPACES_KEY) {
        serde_json::from_value(val.clone()).map_err(|e| e.to_string())
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

    // Quitar del listado de workspaces
    let mut workspaces = get_workspaces(app)?;
    workspaces.retain(|p| p != &path);
    store.set(WORKSPACES_KEY, json!(workspaces));

    // Limpiar el índice: quitar todas las entradas que pertenecían a este workspace
    let mut index = get_workflow_index(app)?;
    index.retain(|entry| entry.workspace != path);
    store.set(INDEX_KEY, json!(index));

    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

// ──── Índice de Workflows ────

pub fn get_workflow_index(app: &AppHandle) -> Result<Vec<FluxEntry>, String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;

    if let Some(val) = store.get(INDEX_KEY) {
        serde_json::from_value(val.clone()).map_err(|e| e.to_string())
    } else {
        Ok(Vec::new())
    }
}

pub fn set_workflow_index(app: &AppHandle, index: &[FluxEntry]) -> Result<(), String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    store.set(INDEX_KEY, json!(index));
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

/// Añade una entrada al índice (cuando se crea un workflow nuevo).
pub fn add_to_index(app: &AppHandle, entry: FluxEntry) -> Result<(), String> {
    let mut index = get_workflow_index(app)?;
    // Evitar duplicados por path
    if !index.iter().any(|e| e.path == entry.path) {
        index.push(entry);
        set_workflow_index(app, &index)?;
    }
    Ok(())
}

/// Elimina una entrada del índice por path.
pub fn remove_from_index(app: &AppHandle, path: &str) -> Result<(), String> {
    let mut index = get_workflow_index(app)?;
    index.retain(|e| e.path != path);
    set_workflow_index(app, &index)?;
    Ok(())
}
