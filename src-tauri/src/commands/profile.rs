use std::fs;
use tauri::{AppHandle, Manager};
use image::imageops::FilterType;

use crate::errors::AppError;

#[tauri::command]
pub async fn process_and_save_avatar(app: AppHandle, file_path: String) -> Result<String, AppError> {
    // Read the image from the given path
    let img = image::open(&file_path).map_err(|e| AppError::Storage(format!("Failed to open image: {}", e)))?;
    
    // Resize image
    let resized = img.resize_to_fill(256, 256, image::imageops::FilterType::Lanczos3);

    // Ensure directory exists
    let app_data_dir = app.path().app_data_dir().map_err(|e| AppError::Storage(e.to_string()))?;
    let avatar_dir = app_data_dir.join("avatars");
    
    if !avatar_dir.exists() {
        fs::create_dir_all(&avatar_dir).map_err(|e| AppError::Storage(format!("Failed to create directory: {}", e)))?;
    }

    // Save image
    let output_path = avatar_dir.join("avatar.webp");
    resized.save(&output_path).map_err(|e| AppError::Storage(format!("Failed to save image: {}", e)))?;
    
    // Return the absolute path so the frontend can use convertFileSrc
    Ok(output_path.to_string_lossy().into_owned())
}
