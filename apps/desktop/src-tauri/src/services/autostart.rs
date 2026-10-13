//! Inicio automático con el sistema (login item / registro / .desktop).
//!
//! La preferencia vive en `AppConfig.autostart` (única fuente de verdad). Este módulo
//! solo sincroniza el estado del SO con esa preferencia.

use tauri::AppHandle;
use crate::errors::AppError;

/// Argumento con el que el SO relanza la app: arranca sin mostrar la ventana principal.
pub const MINIMIZED_ARG: &str = "--minimized";

/// Hace que el SO refleje `enabled`. En compilaciones de desarrollo no hace nada
/// (registraría el binario de `target/debug` como app de inicio).
pub fn apply(app: &AppHandle, enabled: bool) -> Result<(), AppError> {
    if cfg!(debug_assertions) {
        tracing::info!("Autostart ({enabled}): omitido en modo desarrollo");
        return Ok(());
    }

    #[cfg(desktop)]
    {
        use tauri_plugin_autostart::ManagerExt;
        let manager = app.autolaunch();
        let current = manager.is_enabled().unwrap_or(false);
        let result = match (enabled, current) {
            (true, false) => manager.enable(),
            (false, true) => manager.disable(),
            _ => Ok(()),
        };
        result.map_err(|e| AppError::Internal(format!("No se pudo actualizar el inicio automático: {e}")))?;
    }

    #[cfg(not(desktop))]
    let _ = (app, enabled);

    Ok(())
}
