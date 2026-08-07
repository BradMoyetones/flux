use tauri::{AppHandle, command};
use crate::models::workflow::Workflow;
use crate::storage::settings::{
    add_workspace, get_workspaces, remove_workspace,
    get_workflow_index, set_workflow_index, add_to_index, remove_from_index,
};
use crate::storage::file_scanner::{scan_flux_paths, save_workflow_file, delete_workflow_file, FluxEntry};
use std::path::PathBuf;

#[command]
pub async fn cmd_get_workspaces(app: AppHandle) -> Result<Vec<String>, String> {
    get_workspaces(&app)
}

#[command]
pub async fn cmd_add_workspace(app: AppHandle, path: String) -> Result<Vec<FluxEntry>, String> {
    add_workspace(&app, path.clone())?;

    // Escanear solo este workspace nuevo (solo paths, sin leer archivos)
    let new_entries = tauri::async_runtime::spawn_blocking(move || {
        scan_flux_paths(&[path])
    })
    .await
    .map_err(|e| format!("spawn_blocking error: {e}"))?;

    // Merge con el índice existente
    let mut index = get_workflow_index(&app)?;
    for entry in &new_entries {
        if !index.iter().any(|e| e.path == entry.path) {
            index.push(entry.clone());
        }
    }
    set_workflow_index(&app, &index)?;

    Ok(index)
}

#[command]
pub async fn cmd_remove_workspace(app: AppHandle, path: String) -> Result<(), String> {
    remove_workspace(&app, path)
}

/// Devuelve el índice de workflows desde el store. Sin I/O de disco. Instantáneo.
#[command]
pub async fn cmd_scan_workflows(app: AppHandle) -> Result<Vec<FluxEntry>, String> {
    get_workflow_index(&app)
}

/// Fuerza un re-escaneo completo de todos los workspaces y reconstruye el índice.
#[command]
pub async fn cmd_resync_workspaces(app: AppHandle) -> Result<Vec<FluxEntry>, String> {
    let workspaces = get_workspaces(&app)?;

    let entries = tauri::async_runtime::spawn_blocking(move || {
        scan_flux_paths(&workspaces)
    })
    .await
    .map_err(|e| format!("spawn_blocking error: {e}"))?;

    set_workflow_index(&app, &entries)?;
    Ok(entries)
}

#[command]
pub async fn cmd_save_workflow(path: String, workflow: Workflow) -> Result<(), String> {
    let path_clone = path.clone();
    let content = serde_json::to_string_pretty(&workflow).map_err(|e| e.to_string())?;

    tauri::async_runtime::spawn_blocking(move || {
        save_workflow_file(&path_clone, &content)
    })
    .await
    .map_err(|e| format!("spawn_blocking error: {e}"))?
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
    .map_err(|e| format!("spawn_blocking error: {e}"))?
}

/// Registra un workflow recién creado en el índice.
#[command]
pub async fn cmd_register_workflow(app: AppHandle, path: String, name: String, workspace: String) -> Result<(), String> {
    add_to_index(&app, FluxEntry { name, path, workspace })
}

/// Elimina un archivo .flux del disco y lo quita del índice.
#[command]
pub async fn cmd_delete_workflow(app: AppHandle, path: String) -> Result<(), String> {
    let path_clone = path.clone();

    // Borrar el archivo físico
    tauri::async_runtime::spawn_blocking(move || {
        delete_workflow_file(&path_clone)
    })
    .await
    .map_err(|e| format!("spawn_blocking error: {e}"))??;

    // Quitar del índice
    remove_from_index(&app, &path)
}
