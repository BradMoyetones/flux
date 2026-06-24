mod commands;
mod engine;
mod errors;
mod models;
mod services;
mod state;
mod steps;

use std::collections::HashMap;

use tauri::Manager;
use tokio::sync::Mutex;
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

use services::whatsapp_client::WhatsAppCore;
// use services::http_client::HttpClient;
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Obtenemos la ventana nativa de Tauri v2
            let window = app.get_webview_window("main").unwrap();

            // Aplicamos Vibrancy real de macOS usando los métodos del trait
            #[cfg(target_os = "macos")]
            apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None)
                .expect("No se pudo aplicar el Vibrancy en macOS");

            #[cfg(target_os = "windows")]
            window_vibrancy::apply_blur(&window, Some((18, 18, 18, 125)))
                .expect("Unsupported platform! 'apply_blur' is only supported on Windows");

            app.manage(AppState {
                workflows: Mutex::new(HashMap::new()),
                wa_client: Mutex::new(WhatsAppCore::new()),
                // http_client: HttpClient::new(),
            });

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(commands::get_handlers())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
