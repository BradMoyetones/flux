use std::fs;
use std::path::Path;
use tauri::{AppHandle, Manager};

use crate::errors::AppError;

#[tauri::command]
pub async fn process_and_save_avatar(app: AppHandle, file_path: String) -> Result<String, AppError> {
    let source_path = Path::new(&file_path);
    
    // Check if source exists
    if !source_path.exists() {
        return Err(AppError::Storage("Source file does not exist".to_string()));
    }

    // Get the AppData directory
    let app_data_dir = app.path().app_data_dir().map_err(|e| AppError::Storage(e.to_string()))?;
    let avatar_dir = app_data_dir.join("avatars");
    
    // Create avatars directory if it doesn't exist
    if !avatar_dir.exists() {
        fs::create_dir_all(&avatar_dir).map_err(|e| AppError::Storage(format!("Failed to create directory: {}", e)))?;
    }

    // Get original extension, default to png if not found
    let extension = source_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("png");

    let output_path = avatar_dir.join(format!("avatar.{}", extension));
    
    // Copy the file instead of processing it, to preserve animations and any format
    fs::copy(&source_path, &output_path)
        .map_err(|e| AppError::Storage(format!("Failed to copy image: {}", e)))?;
    
    // Return the absolute path so the frontend can use convertFileSrc
    Ok(output_path.to_string_lossy().into_owned())
}
