use tauri::AppHandle;
use crate::errors::AppError;

#[tauri::command]
pub async fn cmd_test_notification(app: AppHandle) -> Result<(), AppError> {
    crate::services::notifications::send_notification(
        &app,
        "Flux - Prueba",
        "¡Las notificaciones están funcionando correctamente! 🚀",
    )
    .map_err(AppError::Internal)?;
    Ok(())
}
