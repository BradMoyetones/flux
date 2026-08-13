mod commands;
mod core;
mod errors;
mod models;
mod plugins;
mod storage;
mod services;
mod state;

use tauri::{Manager, WindowEvent, Emitter};
#[cfg(target_os = "macos")]
use tauri::RunEvent;
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
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            // Setup Tracing & Terminal Logger
            use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
            let terminal_layer = crate::core::terminal_logger::init_terminal_logger(app.handle().clone());
            tracing_subscriber::registry()
                .with(terminal_layer)
                .init();

            // Setup Global Panic Hook
            let app_handle = app.handle().clone();
            std::panic::set_hook(Box::new(move |info| {
                let msg = match info.payload().downcast_ref::<&'static str>() {
                    Some(s) => *s,
                    None => match info.payload().downcast_ref::<String>() {
                        Some(s) => &s[..],
                        None => "Box<dyn Any>",
                    },
                };
                
                let location = info.location().unwrap();
                let panic_msg = format!("\x1b[31m[PANIC] Thread panicked at '{}', {}\x1b[0m\r\n", msg, location);
                eprintln!("{}", panic_msg);
                let _ = app_handle.emit("terminal://stdout", panic_msg);
            }));

            // Obtenemos la ventana nativa de Tauri v2
            let window = app.get_webview_window("main").unwrap();
            // Aplicamos Vibrancy real de macOS usando los métodos del trait
            #[cfg(target_os = "macos")]
            apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None)
                .expect("No se pudo aplicar el Vibrancy en macOS");

            #[cfg(target_os = "windows")]
            apply_acrylic(&window, Some((0, 0, 0, 0)))
                .expect("Unsupported platform! 'apply_blur' is only supported on Windows");

            let config = storage::config::load_config(app.handle()).unwrap_or_default();
            
            let scheduler = tauri::async_runtime::block_on(async {
                let s = crate::services::scheduler::SchedulerService::new(app.handle().clone()).await.unwrap();
                s.start().await.unwrap();
                s
            });

            let app_state = crate::state::AppState {
                wa_manager: std::sync::Arc::new(crate::services::whatsapp_manager::WhatsAppManager::new()),
                config: std::sync::Arc::new(tokio::sync::RwLock::new(config)),
                scheduler: std::sync::Arc::new(scheduler),
                active_executions: std::sync::Mutex::new(std::collections::HashMap::new()),
            };
            app.manage(std::sync::Arc::new(app_state));

            // Setup System Tray
            crate::core::tray::setup_tray(app)?;

            // Window close behavior: hide instead of close if runInBackground is true
            let window = app.get_webview_window("main").unwrap();
            let window_clone = window.clone();
            let app_handle_for_close = app.handle().clone();
            window.on_window_event(move |event| match event {
                WindowEvent::CloseRequested { api, .. } => {
                    let state = app_handle_for_close.state::<std::sync::Arc<crate::state::AppState>>();
                    let run_in_background = {
                        let config = tauri::async_runtime::block_on(state.config.read());
                        config.general.run_in_background
                    };
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
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, _event| {
            // macOS: Reopen event when user clicks the dock icon
            #[cfg(target_os = "macos")]
            if let RunEvent::Reopen { .. } = &_event {
                if let Some(window) = _app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            }
        });
}
