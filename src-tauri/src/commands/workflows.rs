use tauri::{AppHandle, command};
use crate::models::workflow::Workflow;
use crate::storage::settings::{add_workspace, get_workspaces, remove_workspace};
use crate::storage::file_scanner::{scan_workspaces, save_workflow};
use std::path::PathBuf;

#[command]
pub async fn cmd_get_workspaces(app: AppHandle) -> Result<Vec<String>, String> {
    get_workspaces(&app)
}

#[command]
pub async fn cmd_add_workspace(app: AppHandle, path: String) -> Result<(), String> {
    add_workspace(&app, path)
}

#[command]
pub async fn cmd_remove_workspace(app: AppHandle, path: String) -> Result<(), String> {
    remove_workspace(&app, path)
}

#[command]
pub async fn cmd_scan_workflows(app: AppHandle) -> Result<Vec<Workflow>, String> {
    let workspaces = get_workspaces(&app)?;

    // WalkDir + std::fs::read_to_string son operaciones bloqueantes del OS.
    // Las despachamos a un hilo dedicado de blocking para no congelar la UI.
    tauri::async_runtime::spawn_blocking(move || {
        scan_workspaces(workspaces)
    })
    .await
    .map_err(|e| format!("spawn_blocking join error: {e}"))?
}

#[command]
pub async fn cmd_save_workflow(path: String, workflow: Workflow) -> Result<(), String> {
    let path_clone = path.clone();
    let workflow_clone = workflow.clone();

    tauri::async_runtime::spawn_blocking(move || {
        save_workflow(&path_clone, &workflow_clone)
    })
    .await
    .map_err(|e| format!("spawn_blocking join error: {e}"))?
}

#[command]
pub async fn cmd_get_workflow(path: String) -> Result<Workflow, String> {
    let path_clone = path.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let abs = PathBuf::from(&path_clone);
        if !abs.is_absolute() {
            return Err("Se requiere una ruta absoluta para leer el workflow".into());
        }
        let content = std::fs::read_to_string(&abs).map_err(|e| e.to_string())?;
        let mut workflow: Workflow = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        workflow.path = Some(path_clone);
        Ok(workflow)
    })
    .await
    .map_err(|e| format!("spawn_blocking join error: {e}"))?
}
