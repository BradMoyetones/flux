use std::fs;
use tauri::{AppHandle, Manager};
use image::imageops::FilterType;

use crate::errors::AppError;

#[tauri::command]
pub async fn process_and_save_avatar(app: AppHandle, file_path: String) -> Result<String, AppError> {
    // Read the image from the given path
    let img = image::open(&file_path).map_err(|e| AppError::Internal(format!("Failed to open image: {}", e)))?;
    
    // Resize the image to 256x256 (optimized for avatars)
    let resized = img.resize_to_fill(256, 256, FilterType::Lanczos3);
    
    // Get the AppData directory
    let app_data_dir = app.path().app_data_dir().map_err(|e| AppError::Internal(e.to_string()))?;
    
    // Create avatars directory if it doesn't exist
    let avatar_dir = app_data_dir.join("avatars");
    fs::create_dir_all(&avatar_dir).map_err(|e| AppError::Internal(format!("Failed to create directory: {}", e)))?;
    
    // Save as webp for best compression
    let output_path = avatar_dir.join("avatar.webp");
    
    // Save the image
    resized.save(&output_path).map_err(|e| AppError::Internal(format!("Failed to save image: {}", e)))?;
    
    // Return the absolute path so the frontend can use convertFileSrc
    Ok(output_path.to_string_lossy().into_owned())
}
