use std::sync::atomic::Ordering;
use tauri::{Manager, Window};

use crate::errors::AppError;
use crate::state::StartupState;

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

/// Transición splash → ventana principal. Idempotente: solo la primera llamada
/// muestra la ventana principal (así el timeout de seguridad no la vuelve a mostrar
/// si el usuario ya la ocultó en el tray). Si la app arrancó con `--minimized`
/// (autostart) se cierra el splash pero la ventana principal queda oculta.
pub fn finish_startup(app: &tauri::AppHandle) -> Result<(), AppError> {
    if let Some(splash) = app.get_webview_window("splashscreen") {
        let _ = splash.close();
    }

    let Some(startup) = app.try_state::<StartupState>() else { return Ok(()) };
    if startup.done.swap(true, Ordering::SeqCst) {
        return Ok(());
    }

    if !startup.start_minimized {
        if let Some(main) = app.get_webview_window("main") {
            main.show().map_err(|e| AppError::Internal(e.to_string()))?;
            main.set_focus().map_err(|e| AppError::Internal(e.to_string()))?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn close_splashscreen(app: tauri::AppHandle) -> Result<(), AppError> {
    finish_startup(&app)
}

#[tauri::command]
pub async fn set_run_in_background(
    app: tauri::AppHandle,
    state: tauri::State<'_, std::sync::Arc<crate::state::AppState>>,
    enabled: bool,
) -> Result<(), AppError> {
    state.config.update(&app, |c| c.run_in_background = enabled)
}

#[tauri::command]
pub fn cmd_get_terminal_history() -> String {
    crate::core::terminal_logger::get_log_history()
}
