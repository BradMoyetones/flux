use std::sync::Arc;
use tauri::{AppHandle, State};

use crate::errors::AppError;
use crate::state::{AppConfig, AppState, GlobalVariable};
use crate::storage::config::save_config;
use crate::commands::window::RunInBackgroundState;

#[tauri::command]
pub async fn cmd_get_config(state: State<'_, Arc<AppState>>) -> Result<AppConfig, AppError> {
    let config = state.config.read().await;
    Ok(config.clone())
}

#[tauri::command]
pub async fn cmd_update_config(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    run_state: State<'_, RunInBackgroundState>,
    config: AppConfig,
) -> Result<(), AppError> {
    {
        let mut current = state.config.write().await;
        *current = config.clone();
    }
    
    *run_state.0.lock().unwrap() = config.general.run_in_background;
    
    save_config(&app, &config).map_err(AppError::Internal)?;
    
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
    
    save_config(&app, &config_clone).map_err(AppError::Internal)?;
    
    Ok(())
}
