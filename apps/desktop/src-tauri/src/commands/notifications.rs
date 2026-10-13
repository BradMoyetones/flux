use tauri::AppHandle;
use crate::errors::AppError;

#[tauri::command]
pub async fn cmd_test_notification(app: AppHandle) -> Result<(), AppError> {
    crate::services::notifications::notify_test(&app)
        .map_err(AppError::Internal)?;
    Ok(())
}
