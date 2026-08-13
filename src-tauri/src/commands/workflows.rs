use tauri::{AppHandle, command};
use crate::models::workflow::Workflow;
use crate::storage::settings::{
    add_workspace, get_workspaces, remove_workspace,
    get_workflow_index, set_workflow_index, add_to_index, remove_from_index,
};
use crate::storage::file_scanner::{scan_flux_paths, save_workflow_file, delete_workflow_file, rename_workflow_file, FluxEntry};
use crate::errors::AppError;
use std::path::PathBuf;

#[command]
pub async fn cmd_get_workspaces(app: AppHandle) -> Result<Vec<String>, AppError> {
    get_workspaces(&app)
}

#[command]
pub async fn cmd_add_workspace(app: AppHandle, path: String) -> Result<Vec<FluxEntry>, AppError> {
    add_workspace(&app, path.clone())?;

    // Escanear solo este workspace nuevo (solo paths, sin leer archivos)
    let new_entries = tauri::async_runtime::spawn_blocking(move || {
        scan_flux_paths(&[path])
    })
    .await
    .map_err(|e| AppError::Internal(format!("spawn_blocking error: {e}")))?;

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
pub async fn cmd_remove_workspace(app: AppHandle, path: String) -> Result<(), AppError> {
    remove_workspace(&app, path)
}

/// Devuelve el índice de workflows desde el store. Sin I/O de disco. Instantáneo.
#[command]
pub async fn cmd_scan_workflows(app: AppHandle) -> Result<Vec<FluxEntry>, AppError> {
    get_workflow_index(&app)
}

/// Fuerza un re-escaneo completo de todos los workspaces y reconstruye el índice.
#[command]
pub async fn cmd_resync_workspaces(app: AppHandle) -> Result<Vec<FluxEntry>, AppError> {
    let workspaces = get_workspaces(&app)?;

    let entries = tauri::async_runtime::spawn_blocking(move || {
        scan_flux_paths(&workspaces)
    })
    .await
    .map_err(|e| AppError::Internal(format!("spawn_blocking error: {e}")))?;

    set_workflow_index(&app, &entries)?;
    Ok(entries)
}

#[command]
pub async fn cmd_save_workflow(path: String, workflow: Workflow) -> Result<(), AppError> {
    let path_clone = path.clone();
    let content = serde_json::to_string_pretty(&workflow).map_err(|e| AppError::InvalidConfig(e.to_string()))?;

    tauri::async_runtime::spawn_blocking(move || {
        save_workflow_file(&path_clone, &content)
    })
    .await
    .map_err(|e| AppError::Internal(format!("spawn_blocking error: {e}")))??;
    
    Ok(())
}

#[command]
pub async fn cmd_get_workflow(path: String) -> Result<Workflow, AppError> {
    let path_clone = path.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let abs = PathBuf::from(&path_clone);
        if !abs.is_absolute() {
            return Err(AppError::InvalidConfig("Se requiere una ruta absoluta para leer el workflow".into()));
        }
        let content = std::fs::read_to_string(&abs).map_err(|e| AppError::Storage(e.to_string()))?;
        let mut workflow: Workflow = serde_json::from_str(&content).map_err(|e| AppError::InvalidConfig(e.to_string()))?;
        workflow.path = Some(path_clone);
        Ok(workflow)
    })
    .await
    .map_err(|e| AppError::Internal(format!("spawn_blocking error: {e}")))?
}

/// Registra un workflow recién creado en el índice.
#[command]
pub async fn cmd_register_workflow(app: AppHandle, path: String, name: String, workspace: String) -> Result<(), AppError> {
    add_to_index(&app, FluxEntry { name, path, workspace })
}

/// Elimina un archivo .flux del disco y lo quita del índice.
#[command]
pub async fn cmd_delete_workflow(app: AppHandle, path: String) -> Result<(), AppError> {
    let path_clone = path.clone();

    // Borrar el archivo físico
    tauri::async_runtime::spawn_blocking(move || {
        delete_workflow_file(&path_clone)
    })
    .await
    .map_err(|e| AppError::Internal(format!("spawn_blocking error: {e}")))??;

    // Quitar del índice
    remove_from_index(&app, &path)
}

/// Renombra un workflow cambiando su archivo .flux físico y actualizando el índice.
#[command]
pub async fn cmd_rename_workflow(app: AppHandle, old_path: String, new_name: String) -> Result<String, AppError> {
    let old_path_clone = old_path.clone();
    
    // 1. Mover el archivo físico
    let new_path = tauri::async_runtime::spawn_blocking(move || {
        rename_workflow_file(&old_path_clone, &new_name)
    })
    .await
    .map_err(|e| AppError::Internal(format!("spawn_blocking error: {}", e)))??;
    
    // 2. Actualizar el índice
    let mut index = get_workflow_index(&app)?;
    if let Some(pos) = index.iter().position(|e| e.path == old_path) {
        let mut entry = index.remove(pos);
        entry.path = new_path.clone();
        let name_stem = std::path::Path::new(&new_path)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("sin-nombre")
            .to_string();
        entry.name = name_stem;
        index.push(entry);
        set_workflow_index(&app, &index)?;
    }
    
    Ok(new_path)
}
