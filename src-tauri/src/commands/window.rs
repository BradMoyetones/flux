use tauri::{Manager, Window};
use std::sync::Mutex;

pub struct RunInBackgroundState(pub Mutex<bool>);

use crate::errors::AppError;

#[tauri::command]
pub async fn minimize_window(window: Window) -> Result<(), AppError> {
    window
        .minimize()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub async fn close_window(window: Window) -> Result<(), AppError> {
    window
        .close()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub async fn toggle_fullscreen(window: Window) -> Result<(), AppError> {
    let is_fullscreen = window
        .is_fullscreen()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    window
        .set_fullscreen(!is_fullscreen)
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub async fn close_splashscreen(app: tauri::AppHandle) -> Result<(), AppError> {
    if let Some(splash) = app.get_webview_window("splashscreen") {
        splash.close().map_err(|e| AppError::Internal(e.to_string()))?;
    }

    if let Some(main) = app.get_webview_window("main") {
        main.show().map_err(|e| AppError::Internal(e.to_string()))?;
        main.set_focus().map_err(|e| AppError::Internal(e.to_string()))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn set_run_in_background(
    app: tauri::AppHandle,
    state: tauri::State<'_, std::sync::Arc<crate::state::AppState>>,
    run_state: tauri::State<'_, RunInBackgroundState>,
    enabled: bool,
) -> Result<(), AppError> {
    *run_state.0.lock().unwrap() = enabled;
    
    let config_clone = {
        let mut config = state.config.write().await;
        config.general.run_in_background = enabled;
        config.clone()
    };
    crate::storage::config::save_config(&app, &config_clone).map_err(AppError::Internal)?;
    Ok(())
}

#[tauri::command]
pub fn cmd_get_terminal_history() -> String {
    crate::core::terminal_logger::get_log_history()
}
