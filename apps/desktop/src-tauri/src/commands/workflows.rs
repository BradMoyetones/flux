use std::path::{Path, PathBuf};
use std::sync::Arc;
use serde_json::Value;
use tauri::{AppHandle, State, command};
use crate::models::workflow::Workflow;
use crate::state::AppState;
use crate::storage::file_scanner::{
    scan_flux_paths, save_workflow_file, delete_workflow_file, rename_workflow_file,
    ensure_workflow_path, read_disk_metadata, FluxEntry,
};
use crate::errors::AppError;

fn join_error(e: tauri::Error) -> AppError {
    AppError::Internal(format!("spawn_blocking error: {e}"))
}

#[command]
pub async fn cmd_get_workspaces(state: State<'_, Arc<AppState>>) -> Result<Vec<String>, AppError> {
    Ok(state.config.workspaces())
}

#[command]
pub async fn cmd_add_workspace(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    path: String,
) -> Result<Vec<FluxEntry>, AppError> {
    if !Path::new(&path).is_dir() {
        return Err(AppError::InvalidConfig(format!("'{path}' no es una carpeta válida")));
    }
    state.config.add_workspace(&app, path.clone())?;

    // Escanear solo este workspace nuevo (solo paths, sin leer archivos)
    let new_entries = tauri::async_runtime::spawn_blocking(move || scan_flux_paths(&[path]))
        .await
        .map_err(join_error)?;

    // Merge con el índice existente (los ya conocidos no se duplican)
    state.db.upsert_index_many(&new_entries)?;
    let index = state.db.list_index()?;

    Ok(index)
}

#[command]
pub async fn cmd_remove_workspace(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    path: String,
) -> Result<(), AppError> {
    state.config.remove_workspace(&app, &path)?;
    state.db.remove_workspace_index(&path)
}

/// Devuelve el índice de workflows (SQLite). No toca el filesystem.
#[command]
pub async fn cmd_scan_workflows(state: State<'_, Arc<AppState>>) -> Result<Vec<FluxEntry>, AppError> {
    state.db.list_index()
}

/// Fuerza un re-escaneo completo de todos los workspaces y reconstruye el índice.
#[command]
pub async fn cmd_resync_workspaces(
    state: State<'_, Arc<AppState>>,
) -> Result<Vec<FluxEntry>, AppError> {
    let workspaces = state.config.workspaces();

    let entries = tauri::async_runtime::spawn_blocking(move || scan_flux_paths(&workspaces))
        .await
        .map_err(join_error)?;

    state.db.replace_index(&entries)?;
    state.db.list_index()
}

#[command]
pub async fn cmd_save_workflow(
    state: State<'_, Arc<AppState>>,
    path: String,
    workflow: Workflow,
) -> Result<(), AppError> {
    let workspaces = state.config.workspaces();

    tauri::async_runtime::spawn_blocking(move || -> Result<(), AppError> {
        ensure_workflow_path(&workspaces, &path)?;

        let mut value = serde_json::to_value(&workflow).map_err(|e| AppError::InvalidConfig(e.to_string()))?;
        if let Some(obj) = value.as_object_mut() {
            // La ruta absoluta es un dato de runtime: no se persiste dentro del archivo
            // (el archivo debe ser portable). `cmd_get_workflow` la rellena al leer.
            obj.remove("path");
            // Las estadísticas de ejecución las gestiona el backend. Siempre se conserva
            // lo que hay en disco, nunca lo que el editor tenía en memoria.
            match read_disk_metadata(&path) {
                Some(meta) => { obj.insert("metadata".into(), meta); }
                None => { obj.remove("metadata"); }
            }
        }
        let content = serde_json::to_string_pretty(&value).map_err(|e| AppError::InvalidConfig(e.to_string()))?;
        save_workflow_file(&path, &content)
    })
    .await
    .map_err(join_error)?
}

#[command]
pub async fn cmd_get_workflow(
    state: State<'_, Arc<AppState>>,
    path: String,
) -> Result<Workflow, AppError> {
    let workspaces = state.config.workspaces();

    tauri::async_runtime::spawn_blocking(move || {
        ensure_workflow_path(&workspaces, &path)?;
        let content = std::fs::read_to_string(&path).map_err(|e| AppError::Storage(e.to_string()))?;
        let mut workflow: Workflow = serde_json::from_str(&content).map_err(|e| AppError::InvalidConfig(e.to_string()))?;
        workflow.path = Some(path);
        Ok(workflow)
    })
    .await
    .map_err(join_error)?
}

/// Registra un workflow recién creado en el índice.
#[command]
pub async fn cmd_register_workflow(
    state: State<'_, Arc<AppState>>,
    path: String,
    name: String,
    workspace: String,
) -> Result<(), AppError> {
    ensure_workflow_path(&state.config.workspaces(), &path)?;
    if !state.config.workspaces().contains(&workspace) {
        return Err(AppError::InvalidConfig("El workspace no está registrado".into()));
    }
    state.db.upsert_index(&FluxEntry { name, path, workspace })
}

/// Elimina un archivo .flux del disco y lo quita del índice (y del scheduler).
#[command]
pub async fn cmd_delete_workflow(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    path: String,
) -> Result<(), AppError> {
    let workspaces = state.config.workspaces();
    let path_clone = path.clone();

    // Borrar el archivo físico (devolvemos el id para detener su ejecución/programación)
    let workflow_id = tauri::async_runtime::spawn_blocking(move || -> Result<Option<String>, AppError> {
        ensure_workflow_path(&workspaces, &path_clone)?;
        let id = std::fs::read_to_string(&path_clone)
            .ok()
            .and_then(|c| serde_json::from_str::<Value>(&c).ok())
            .and_then(|v| v.get("id").and_then(|i| i.as_str().map(String::from)));
        delete_workflow_file(&path_clone)?;
        Ok(id)
    })
    .await
    .map_err(join_error)??;

    if let Some(id) = workflow_id {
        crate::core::runs::stop_run(&app, &id)?;
        state.scheduler.unschedule_workflow(&id).await?;
    }

    state.db.remove_index(&path)
}

/// Renombra un workflow cambiando su archivo .flux físico y actualizando el índice.
#[command]
pub async fn cmd_rename_workflow(
    state: State<'_, Arc<AppState>>,
    old_path: String,
    new_name: String,
) -> Result<String, AppError> {
    let workspaces = state.config.workspaces();
    let old_path_clone = old_path.clone();

    // 1. Mover el archivo físico
    let new_path = tauri::async_runtime::spawn_blocking(move || {
        ensure_workflow_path(&workspaces, &old_path_clone)?;
        rename_workflow_file(&old_path_clone, &new_name)
    })
    .await
    .map_err(join_error)??;

    // 2. Actualizar el índice
    let name_stem = PathBuf::from(&new_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("sin-nombre")
        .to_string();

    state.db.rename_index(&old_path, &new_path, &name_stem)?;

    Ok(new_path)
}
