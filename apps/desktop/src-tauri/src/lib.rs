mod commands;
mod core;
mod errors;
mod models;
mod plugins;
mod storage;
mod services;
mod state;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use tauri::{Manager, WindowEvent, Emitter};
#[cfg(target_os = "macos")]
use tauri::RunEvent;
use tauri_plugin_os;
use window_vibrancy::*;

use crate::services::autostart;
use crate::state::{AppConfig, StartupState};

/// Si la UI no avisa en este tiempo (render roto, red lenta…), se muestra la
/// ventana principal igualmente para que la app nunca parezca colgada tras el splash.
const SPLASH_TIMEOUT: Duration = Duration::from_secs(15);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // La app se relanza con este argumento desde el inicio automático del sistema:
    // en ese caso arranca oculta (System Tray) en vez de abrir la ventana.
    let start_minimized = std::env::args().any(|a| a == autostart::MINIMIZED_ARG);

    let builder = tauri::Builder::default()
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
        }));

    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_autostart::init(
        tauri_plugin_autostart::MacosLauncher::LaunchAgent,
        Some(vec![autostart::MINIMIZED_ARG]),
    ));

    builder
        .setup(move |app| {
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

                let location = info
                    .location()
                    .map(|l| l.to_string())
                    .unwrap_or_else(|| "ubicación desconocida".to_string());
                let panic_msg = format!("\x1b[31m[PANIC] Thread panicked at '{}', {}\x1b[0m\r\n", msg, location);
                eprintln!("{}", panic_msg);
                let _ = app_handle.emit("terminal://stdout", panic_msg);
            }));

            app.manage(StartupState {
                start_minimized,
                done: AtomicBool::new(false),
            });

            // Obtenemos la ventana nativa de Tauri v2
            let window = app
                .get_webview_window("main")
                .ok_or("No se encontró la ventana principal 'main'")?;

            // El vibrancy es cosmético: si el SO no lo soporta NO debe tumbar la app.
            #[cfg(target_os = "macos")]
            if let Err(e) = apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None) {
                tracing::warn!("No se pudo aplicar el vibrancy en macOS: {e}");
            }

            #[cfg(target_os = "windows")]
            if let Err(e) = apply_acrylic(&window, Some((0, 0, 0, 0))) {
                tracing::warn!("No se pudo aplicar acrylic en Windows: {e}");
            }

            // Config: dueño único en Rust (ConfigService).
            let config = storage::config::load_config(app.handle()).unwrap_or_else(|e| {
                tracing::error!("No se pudo cargar la configuración, se usan valores por defecto: {e}");
                AppConfig::default()
            });
            // Guardar inmediatamente asegura que el archivo exista con todos los campos.
            let _ = storage::config::save_config(app.handle(), &config);
            let autostart_enabled = config.autostart;

            // SQLite: índice de workflows e historial de ejecuciones.
            let db = Arc::new(storage::db::Db::open(app.handle())?);
            // Migración única del índice que antes vivía dentro de user-settings.json.
            if db.meta_get("legacy_index_migrated")?.is_none() {
                let legacy = storage::config::take_legacy_workflow_index(app.handle());
                if !legacy.is_empty() {
                    tracing::info!("Migrando {} workflows del índice antiguo a SQLite", legacy.len());
                    db.upsert_index_many(&legacy)?;
                }
                db.meta_set("legacy_index_migrated", "1")?;
            }
            // Runs que quedaron "en curso" por un cierre forzado.
            match db.mark_orphan_runs_interrupted() {
                Ok(n) if n > 0 => tracing::warn!("{n} ejecución(es) interrumpida(s) por un cierre inesperado"),
                Ok(_) => {}
                Err(e) => tracing::warn!("No se pudo revisar el historial: {e}"),
            }
            // Retención del historial: 30 días / 200 runs por flujo.
            if let Err(e) = db.prune_runs(30, 200) {
                tracing::warn!("No se pudo podar el historial: {e}");
            }

            let scheduler = tauri::async_runtime::block_on(async {
                let s = crate::services::scheduler::SchedulerService::new(app.handle().clone()).await?;
                s.start().await?;
                Ok::<_, errors::AppError>(s)
            })?;

            let app_state = Arc::new(crate::state::AppState {
                wa_manager: Arc::new(crate::services::whatsapp_manager::WhatsAppManager::new()),
                config: Arc::new(storage::config::ConfigService::new(config)),
                db,
                scheduler: Arc::new(scheduler),
                registry: Arc::new(crate::plugins::build_registry()),
                active_executions: std::sync::Mutex::new(std::collections::HashMap::new()),
            });
            let scheduler_for_restore = Arc::clone(&app_state.scheduler);
            app.manage(app_state);

            // El SO debe reflejar la preferencia del usuario (p. ej. tras reinstalar/mover la app).
            if let Err(e) = autostart::apply(app.handle(), autostart_enabled) {
                tracing::warn!("No se pudo sincronizar el inicio automático: {e}");
            }

            // Reprogramar los crons que estaban activos antes de cerrar la app.
            tauri::async_runtime::spawn(async move {
                scheduler_for_restore.restore().await;
            });

            // Setup System Tray
            crate::core::tray::setup_tray(app)?;

            // Window close behavior: hide instead of close if runInBackground is true
            let window_clone = window.clone();
            let app_handle_for_close = app.handle().clone();
            window.on_window_event(move |event| match event {
                WindowEvent::CloseRequested { api, .. } => {
                    let run_in_background = crate::storage::config::get_run_in_background(&app_handle_for_close);

                    if run_in_background {
                        let _ = window_clone.hide();
                        api.prevent_close();
                    }
                }
                _ => {}
            });

            // Arranque: splash → ventana principal.
            if start_minimized {
                // Inicio automático: sin splash ni ventana, solo System Tray.
                let _ = crate::commands::window::finish_startup(app.handle());
            } else {
                // Red de seguridad: si la UI nunca avisa, mostramos la app igualmente.
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(SPLASH_TIMEOUT).await;
                    let pending = handle
                        .try_state::<StartupState>()
                        .map(|s| !s.done.load(Ordering::SeqCst))
                        .unwrap_or(false);
                    if pending {
                        tracing::warn!("La UI no terminó de cargar en {SPLASH_TIMEOUT:?}; se muestra la ventana principal");
                        let _ = crate::commands::window::finish_startup(&handle);
                    }
                });
            }

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
