use std::sync::RwLock;

use serde::de::DeserializeOwned;
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager, Wry};
use tauri_plugin_store::{Store, StoreExt};

use crate::errors::AppError;
use crate::state::{AppConfig, AppState, NotificationConfig, DEFAULT_TIMEZONE};
use crate::storage::file_scanner::FluxEntry;

const STORE_PATH: &str = "user-settings.json";

/// Evento emitido al frontend cada vez que la config cambia (payload: `AppConfig`).
pub const CONFIG_CHANGED_EVENT: &str = "config://changed";

// ─────────────────────────────────────────────────────────────────────────────
// ConfigService — ÚNICO punto de lectura/escritura de la configuración.
//
//  • La copia en memoria (`inner`) es la fuente de verdad en runtime.
//  • Toda mutación pasa por `update()`: aplica el cambio, lo persiste a disco y,
//    solo si la persistencia tuvo éxito, lo confirma en memoria y emite
//    `config://changed`.
//  • El frontend NO debe abrir `user-settings.json` directamente.
// ─────────────────────────────────────────────────────────────────────────────
pub struct ConfigService {
    inner: RwLock<AppConfig>,
}

impl ConfigService {
    pub fn new(config: AppConfig) -> Self {
        Self { inner: RwLock::new(config) }
    }

    /// Copia completa de la config actual.
    pub fn snapshot(&self) -> AppConfig {
        self.inner.read().unwrap_or_else(|e| e.into_inner()).clone()
    }

    /// Lee un valor derivado sin clonar toda la config.
    pub fn read<R>(&self, f: impl FnOnce(&AppConfig) -> R) -> R {
        f(&self.inner.read().unwrap_or_else(|e| e.into_inner()))
    }

    /// Aplica `f` sobre una copia, persiste, confirma y notifica.
    pub fn update<R>(
        &self,
        app: &AppHandle,
        f: impl FnOnce(&mut AppConfig) -> R,
    ) -> Result<R, AppError> {
        let (result, snapshot) = {
            let mut guard = self.inner.write().unwrap_or_else(|e| e.into_inner());
            let mut next = guard.clone();
            let result = f(&mut next);
            save_config(app, &next)?;
            *guard = next;
            (result, guard.clone())
        };
        let _ = app.emit(CONFIG_CHANGED_EVENT, &snapshot);
        Ok(result)
    }

    // ──── Workspaces ────

    pub fn workspaces(&self) -> Vec<String> {
        self.read(|c| c.workspaces.clone())
    }

    pub fn add_workspace(&self, app: &AppHandle, path: String) -> Result<(), AppError> {
        self.update(app, |c| {
            if !c.workspaces.contains(&path) {
                c.workspaces.push(path);
            }
        })
    }

    pub fn remove_workspace(&self, app: &AppHandle, path: &str) -> Result<(), AppError> {
        self.update(app, |c| c.workspaces.retain(|p| p != path))
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistencia (tauri-plugin-store). Solo este módulo conoce el formato en disco.
// ─────────────────────────────────────────────────────────────────────────────

fn read_field<T: DeserializeOwned>(store: &Store<Wry>, key: &str, corrupt: &mut bool) -> Option<T> {
    let value = store.get(key)?;
    match serde_json::from_value::<T>(value) {
        Ok(v) => Some(v),
        Err(e) => {
            tracing::error!("Config: el campo '{key}' tiene un formato inválido y se usará el valor por defecto: {e}");
            *corrupt = true;
            None
        }
    }
}

/// Si algún campo no se pudo leer, guardamos una copia del archivo ANTES de que el
/// valor por defecto lo sobrescriba, para que el usuario no pierda datos en silencio.
fn backup_settings_file(app: &AppHandle) {
    let Ok(dir) = app.path().app_data_dir() else { return };
    let src = dir.join(STORE_PATH);
    if !src.exists() {
        return;
    }
    let stamp = chrono::Utc::now().format("%Y%m%dT%H%M%S");
    let dst = dir.join(format!("{STORE_PATH}.bak-{stamp}"));
    match std::fs::copy(&src, &dst) {
        Ok(_) => tracing::warn!("Config: copia de seguridad creada en {}", dst.display()),
        Err(e) => tracing::error!("Config: no se pudo crear la copia de seguridad: {e}"),
    }
}

pub fn load_config(app: &AppHandle) -> Result<AppConfig, AppError> {
    let store = app.store(STORE_PATH).map_err(|e| AppError::Storage(e.to_string()))?;
    let defaults = AppConfig::default();
    let mut corrupt = false;

    let config = AppConfig {
        is_first_time: read_field(&store, "isFirstTime", &mut corrupt).unwrap_or(defaults.is_first_time),
        user_name: read_field(&store, "userName", &mut corrupt).unwrap_or(defaults.user_name),
        theme: read_field(&store, "theme", &mut corrupt).unwrap_or(defaults.theme),
        avatar_path: read_field(&store, "avatarPath", &mut corrupt).unwrap_or(defaults.avatar_path),
        run_in_background: read_field(&store, "runInBackground", &mut corrupt).unwrap_or(defaults.run_in_background),
        autostart: read_field(&store, "autostart", &mut corrupt).unwrap_or(defaults.autostart),
        timezone: read_field(&store, "timezone", &mut corrupt).unwrap_or(defaults.timezone),
        notifications: read_field(&store, "notifications", &mut corrupt).unwrap_or(defaults.notifications),
        variables: read_field(&store, "variables", &mut corrupt).unwrap_or(defaults.variables),
        workspaces: read_field(&store, "workspaces", &mut corrupt).unwrap_or(defaults.workspaces),
    };

    if corrupt {
        backup_settings_file(app);
    }
    Ok(config)
}

pub fn save_config(app: &AppHandle, config: &AppConfig) -> Result<(), AppError> {
    let store = app.store(STORE_PATH).map_err(|e| AppError::Storage(e.to_string()))?;
    store.set("isFirstTime", json!(config.is_first_time));
    store.set("userName", json!(config.user_name));
    store.set("theme", json!(config.theme));
    store.set("avatarPath", json!(config.avatar_path));
    store.set("runInBackground", json!(config.run_in_background));
    store.set("autostart", json!(config.autostart));
    store.set("timezone", json!(config.timezone));
    store.set("notifications", json!(config.notifications));
    store.set("variables", json!(config.variables));
    store.set("workspaces", json!(config.workspaces));
    store.save().map_err(|e| AppError::Storage(e.to_string()))
}

/// Migración única: hasta ahora el índice de workflows vivía dentro de `user-settings.json`
/// (clave `workflow_index`). Lo devuelve y lo elimina del archivo; ahora vive en SQLite.
pub fn take_legacy_workflow_index(app: &AppHandle) -> Vec<FluxEntry> {
    let Ok(store) = app.store(STORE_PATH) else { return Vec::new() };
    let Some(value) = store.get("workflow_index") else { return Vec::new() };
    let entries = serde_json::from_value::<Vec<FluxEntry>>(value).unwrap_or_default();
    store.delete("workflow_index");
    let _ = store.save();
    entries
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de lectura para servicios que solo tienen un `AppHandle`
// ─────────────────────────────────────────────────────────────────────────────

fn with_config<R>(app: &AppHandle, default: R, f: impl FnOnce(&AppConfig) -> R) -> R {
    match app.try_state::<std::sync::Arc<AppState>>() {
        Some(state) => state.config.read(f),
        None => default,
    }
}

pub fn get_notification_config(app: &AppHandle) -> NotificationConfig {
    with_config(app, NotificationConfig::default(), |c| c.notifications.clone())
}

pub fn get_run_in_background(app: &AppHandle) -> bool {
    with_config(app, true, |c| c.run_in_background)
}

pub fn get_default_timezone(app: &AppHandle) -> String {
    with_config(app, DEFAULT_TIMEZONE.to_string(), |c| c.timezone.clone())
}
