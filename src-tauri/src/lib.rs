mod commands;
mod core;
mod errors;
mod models;
mod plugins;
mod storage;
mod services;
mod state;

use tauri::{Manager, WindowEvent};
use tauri::{menu::{Menu, MenuItem, PredefinedMenuItem}, tray::TrayIconBuilder};
use tauri_plugin_os;
use window_vibrancy::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .manage(std::sync::Arc::new(services::whatsapp_manager::WhatsAppManager::new()))
        .manage(commands::window::RunInBackgroundState(std::sync::Mutex::new(true)))
        .setup(|app| {
            // Obtenemos la ventana nativa de Tauri v2
            let window = app.get_webview_window("main").unwrap();
            // Aplicamos Vibrancy real de macOS usando los métodos del trait
            #[cfg(target_os = "macos")]
            apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None)
                .expect("No se pudo aplicar el Vibrancy en macOS");

            #[cfg(target_os = "windows")]
            apply_acrylic(&window, Some((0, 0, 0, 0)))
                .expect("Unsupported platform! 'apply_blur' is only supported on Windows");


            let show_i = MenuItem::with_id(app, "show", "Show Flux", true, None::<&str>).unwrap();
            let hide_i = MenuItem::with_id(app, "hide", "Hide Flux", true, None::<&str>).unwrap();
            let sep_i = PredefinedMenuItem::separator(app).unwrap();
            let quit_i = MenuItem::with_id(app, "quit", "Quit Flux", true, None::<&str>).unwrap();
            
            let menu = Menu::with_items(app, &[&show_i, &hide_i, &sep_i, &quit_i]).unwrap();
            
            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app).unwrap();

            let window = app.get_webview_window("main").unwrap();
            let window_clone = window.clone();
            window.on_window_event(move |event| match event {
                WindowEvent::CloseRequested { api, .. } => {
                    let state = window_clone.state::<commands::window::RunInBackgroundState>();
                    let run_in_background = *state.0.lock().unwrap();
                    if run_in_background {
                        window_clone.hide().unwrap();
                        api.prevent_close();
                    }
                }
                _ => {}
            });

            Ok(())
        })
        .invoke_handler(commands::get_handlers())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
