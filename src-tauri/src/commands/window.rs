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
pub async fn set_run_in_background(state: tauri::State<'_, RunInBackgroundState>, enabled: bool) -> Result<(), AppError> {
    *state.0.lock().unwrap() = enabled;
    Ok(())
}
