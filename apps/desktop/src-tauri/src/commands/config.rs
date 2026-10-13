use std::sync::Arc;
use tauri::{AppHandle, Manager, State};

use crate::errors::AppError;
use crate::state::{AppConfig, AppState, ConfigPatch, GlobalVariable};
use crate::services::autostart;

#[tauri::command]
pub async fn cmd_get_config(state: State<'_, Arc<AppState>>) -> Result<AppConfig, AppError> {
    Ok(state.config.snapshot())
}

/// Aplica cambios parciales a la config. Es la ÚNICA vía de escritura desde el
/// frontend; emite `config://changed` con la config resultante.
#[tauri::command]
pub async fn cmd_patch_config(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    patch: ConfigPatch,
) -> Result<AppConfig, AppError> {
    if let Some(tz) = patch.timezone.as_deref() {
        tz.parse::<chrono_tz::Tz>()
            .map_err(|_| AppError::InvalidConfig(format!("Zona horaria desconocida: '{tz}'")))?;
    }

    // Efectos secundarios primero: si el SO rechaza el cambio, no persistimos nada.
    if let Some(enabled) = patch.autostart {
        autostart::apply(&app, enabled)?;
    }

    state.config.update(&app, |c| {
        if let Some(v) = patch.is_first_time { c.is_first_time = v; }
        if let Some(v) = patch.user_name { c.user_name = v; }
        if let Some(v) = patch.theme { c.theme = v; }
        if let Some(v) = patch.avatar_path { c.avatar_path = v; }
        if let Some(v) = patch.run_in_background { c.run_in_background = v; }
        if let Some(v) = patch.autostart { c.autostart = v; }
        if let Some(v) = patch.timezone { c.timezone = v; }
        if let Some(v) = patch.notifications { c.notifications = v; }
        if let Some(v) = patch.variables { c.variables = v; }
    })?;

    Ok(state.config.snapshot())
}

/// Zonas horarias IANA disponibles (para el selector del frontend).
#[tauri::command]
pub fn cmd_list_timezones() -> Vec<String> {
    chrono_tz::TZ_VARIANTS.iter().map(|tz| tz.name().to_string()).collect()
}

#[tauri::command]
pub async fn cmd_get_global_variables(state: State<'_, Arc<AppState>>) -> Result<Vec<GlobalVariable>, AppError> {
    Ok(state.config.read(|c| c.variables.clone()))
}

#[tauri::command]
pub async fn cmd_set_global_variables(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    variables: Vec<GlobalVariable>,
) -> Result<(), AppError> {
    state.config.update(&app, |c| c.variables = variables)
}

use tauri_plugin_store::StoreExt;

#[tauri::command]
pub async fn cmd_factory_reset(app: AppHandle, restart: bool) -> Result<(), AppError> {
    let state = app.state::<Arc<AppState>>();

    // 1. Matar sesiones de WhatsApp (sidecar)
    state.wa_manager.kill_all_sessions().await;

    // 2. Quitar el inicio automático del SO (una app reseteada no debe seguir arrancando sola)
    let _ = autostart::apply(&app, false);

    // 3. Vaciar el historial / índice (SQLite)
    let _ = state.db.wipe();

    // 3b. Limpiar el store en memoria y persistir el estado vacío
    if let Ok(store) = app.store("user-settings.json") {
        store.clear();
        let _ = store.save();
    }

    // 4. Borrado físico explícito
    if let Ok(app_data_dir) = app.path().app_data_dir() {
        let _ = std::fs::remove_file(app_data_dir.join("user-settings.json"));
        let _ = std::fs::remove_dir_all(app_data_dir.join("avatars"));
    }
    crate::services::scheduler::SchedulerService::purge_state_file(&app);

    // 5. Limpiar caché (Sidecar/WhatsApp cache)
    if let Ok(cache_dir) = app.path().app_cache_dir() {
        let _ = std::fs::remove_dir_all(&cache_dir);
    }

    // 6. Reiniciar o cerrar
    if restart {
        app.restart();
    } else {
        app.exit(0);
    }

    Ok(())
}
