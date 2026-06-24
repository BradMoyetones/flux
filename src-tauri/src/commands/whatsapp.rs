use tauri::{AppHandle, State};

use crate::errors::AppError;
use crate::state::AppState;

#[tauri::command]
pub async fn init_whatsapp(state: State<'_, AppState>, _app: AppHandle) -> Result<String, AppError> {
    let mut client = state.wa_client.lock().await;

    let qr = client.connect().await.map_err(|e| AppError::WhatsApp(e))?;

    Ok(qr)
}

#[tauri::command]
pub async fn send_message(state: State<'_, AppState>, number: String, message: String) -> Result<bool, AppError> {
    let client = state.wa_client.lock().await;
    let result = client.send_message(&number, &message).await;

    match result {
        Ok(_) => Ok(true),
        Err(e) => {
            eprintln!("Error sending message: {:?}", e);
            Err(AppError::WhatsApp(e))
        }
    }
}