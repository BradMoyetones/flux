use std::sync::Arc;
use tauri::{AppHandle, State, Manager};

use crate::errors::AppError;
use crate::state::{AppConfig, AppState, GlobalVariable};
use crate::storage::config::save_config;

#[tauri::command]
pub async fn cmd_get_config(state: State<'_, Arc<AppState>>) -> Result<AppConfig, AppError> {
    let config = state.config.read().await;
    Ok(config.clone())
}

#[tauri::command]
pub async fn cmd_update_config(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    config: AppConfig,
) -> Result<(), AppError> {
    {
        let mut current = state.config.write().await;
        *current = config.clone();
    }
    
    save_config(&app, &config).map_err(AppError::Storage)?;
    
    Ok(())
}

#[tauri::command]
pub async fn cmd_get_global_variables(state: State<'_, Arc<AppState>>) -> Result<Vec<GlobalVariable>, AppError> {
    let config = state.config.read().await;
    Ok(config.variables.clone())
}

#[tauri::command]
pub async fn cmd_set_global_variables(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    variables: Vec<GlobalVariable>,
) -> Result<(), AppError> {
    let config_clone = {
        let mut config = state.config.write().await;
        config.variables = variables;
        config.clone()
    };
    
    save_config(&app, &config_clone).map_err(AppError::Storage)?;
    
    Ok(())
}

use tauri_plugin_store::StoreExt;

#[tauri::command]
pub async fn cmd_factory_reset(app: AppHandle, restart: bool) -> Result<(), AppError> {
    let state = app.state::<Arc<AppState>>();
    
    // 1. Matar sesiones de WhatsApp (sidecar)
    state.wa_manager.kill_all_sessions().await;

    // 2. Limpiar el store en memoria y persistir el estado vacío
    if let Ok(store) = app.store("user-settings.json") {
        store.clear();
        let _ = store.save();
    }

    // 3. Borrado físico explícito
    if let Ok(app_data_dir) = app.path().app_data_dir() {
        let _ = std::fs::remove_file(app_data_dir.join("user-settings.json"));
        let _ = std::fs::remove_dir_all(app_data_dir.join("avatars"));
    }

    // 4. Limpiar caché (Sidecar/WhatsApp cache)
    if let Ok(cache_dir) = app.path().app_cache_dir() {
        let _ = std::fs::remove_dir_all(&cache_dir);
    }

    // 5. Reiniciar o cerrar
    if restart {
        app.restart();
    } else {
        app.exit(0);
    }

    Ok(())
}
