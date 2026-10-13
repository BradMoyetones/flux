//! Scheduler de workflows con trigger `cron`.
//!
//! Reglas de los campos opcionales del trigger (`null` = sin restricción):
//!
//! | campo        | `null`                      | no `null`                                              |
//! |--------------|-----------------------------|--------------------------------------------------------|
//! | `starts_at`  | activo desde que se programa| los ticks anteriores a esa fecha se ignoran            |
//! | `expires_at` | nunca expira                | pasada la fecha → se desprograma (`expired`)           |
//! | `max_runs`   | ilimitado                   | contador persistido; al alcanzarlo → `completed`       |
//! | `timezone`   | zona por defecto de la config (America/Bogota) | cron y fechas se interpretan en esa zona |
//!
//! Las fechas sin offset (lo que envía `<input type="datetime-local">`) se interpretan
//! en la zona horaria del trigger. Las que traen offset/`Z` (RFC 3339) se respetan tal cual.
//!
//! Persistencia: los workflows programados (y su contador de ejecuciones) se guardan en
//! `scheduler-state.json` y se **restauran al arrancar** (`restore`). Cada entrada guarda
//! el workflow tal y como el usuario lo programó, de modo que "lo que programaste es lo
//! que corre" hasta que lo detengas o lo reprogrames.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use chrono_tz::Tz;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex as AsyncMutex;
use tokio_cron_scheduler::{Job, JobScheduler};
use uuid::Uuid;

use crate::core::runs;
use crate::errors::AppError;
use crate::models::workflow::{Trigger, Workflow};
use crate::storage::file_scanner::write_atomic;

pub const STATE_FILE: &str = "scheduler-state.json";

// ──── Estado persistido ────

#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
enum ScheduleStatus {
    Active,
    Expired,
    Completed,
}

#[derive(Serialize, Deserialize, Clone)]
struct ScheduleEntry {
    workflow: Workflow,
    runs: u64,
    status: ScheduleStatus,
}

#[derive(Serialize, Deserialize, Default)]
struct StateFile {
    entries: HashMap<String, ScheduleEntry>,
}

// ──── Trigger validado ────

#[derive(Debug)]
struct ParsedSchedule {
    cron_expr: String,
    tz: Tz,
    starts_at: Option<DateTime<Utc>>,
    expires_at: Option<DateTime<Utc>>,
    max_runs: Option<u64>,
}

fn parse_tz(name: &str) -> Result<Tz, AppError> {
    name.parse::<Tz>()
        .map_err(|_| AppError::InvalidConfig(format!("Zona horaria desconocida: '{name}'")))
}

/// `None` para vacío/null; `Err` para un valor presente pero ilegible.
fn parse_datetime(raw: &Option<String>, tz: Tz, field: &str) -> Result<Option<DateTime<Utc>>, AppError> {
    let Some(raw) = raw.as_deref().map(str::trim).filter(|s| !s.is_empty()) else {
        return Ok(None);
    };

    if let Ok(dt) = DateTime::parse_from_rfc3339(raw) {
        return Ok(Some(dt.with_timezone(&Utc)));
    }
    for fmt in ["%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M"] {
        if let Ok(naive) = NaiveDateTime::parse_from_str(raw, fmt) {
            return tz
                .from_local_datetime(&naive)
                .earliest()
                .map(|d| Some(d.with_timezone(&Utc)))
                .ok_or_else(|| AppError::InvalidConfig(format!("'{field}' no existe en la zona {tz} (cambio de horario)")));
        }
    }
    Err(AppError::InvalidConfig(format!("'{field}' tiene un formato de fecha inválido: '{raw}'")))
}

fn parse_schedule(workflow: &Workflow, default_tz: &str) -> Result<ParsedSchedule, AppError> {
    let Trigger::Cron { expression, timezone, starts_at, expires_at, max_runs } = &workflow.trigger else {
        return Err(AppError::InvalidConfig("El workflow no tiene un trigger de tipo cron".into()));
    };

    let tz_name = timezone.as_deref().map(str::trim).filter(|s| !s.is_empty()).unwrap_or(default_tz);
    let tz = parse_tz(tz_name)?;

    let mut cron_expr = expression.trim().to_string();
    if cron_expr.is_empty() {
        return Err(AppError::InvalidConfig("La expresión cron está vacía".into()));
    }
    // tokio-cron-scheduler exige 6 campos (con segundos). Un cron UNIX de 5 campos
    // se interpreta en el segundo 0.
    if cron_expr.split_whitespace().count() == 5 {
        cron_expr = format!("0 {cron_expr}");
    }

    let starts_at = parse_datetime(starts_at, tz, "Inicia en")?;
    let expires_at = parse_datetime(expires_at, tz, "Expira en")?;
    if let (Some(s), Some(e)) = (starts_at, expires_at) {
        if e <= s {
            return Err(AppError::InvalidConfig("La fecha de expiración debe ser posterior a la de inicio".into()));
        }
    }
    if *max_runs == Some(0) {
        return Err(AppError::InvalidConfig("El máximo de ejecuciones debe ser al menos 1 (o vacío para ilimitado)".into()));
    }

    Ok(ParsedSchedule { cron_expr, tz, starts_at, expires_at, max_runs: *max_runs })
}

// ──── Servicio ────

#[derive(Serialize, Clone)]
struct SchedulerStatusEvent {
    workflow_id: String,
    status: &'static str,
}

#[derive(Serialize, Clone)]
struct TickEvent {
    workflow_id: String,
}

struct Inner {
    app: AppHandle,
    scheduler: JobScheduler,
    jobs: AsyncMutex<HashMap<String, Uuid>>,
    state: Mutex<StateFile>,
    state_path: PathBuf,
}

pub struct SchedulerService {
    inner: Arc<Inner>,
}

impl SchedulerService {
    pub async fn new(app: AppHandle) -> Result<Self, AppError> {
        let scheduler = JobScheduler::new()
            .await
            .map_err(|e| AppError::Scheduler(format!("Failed to create scheduler: {e}")))?;

        let dir = app
            .path()
            .app_data_dir()
            .map_err(|e| AppError::Storage(format!("app_data_dir: {e}")))?;
        std::fs::create_dir_all(&dir).map_err(|e| AppError::Storage(e.to_string()))?;
        let state_path = dir.join(STATE_FILE);

        let state = match std::fs::read_to_string(&state_path) {
            Ok(content) => serde_json::from_str::<StateFile>(&content).unwrap_or_else(|e| {
                tracing::error!("Scheduler: {STATE_FILE} ilegible ({e}); se guarda copia y se empieza vacío");
                let _ = std::fs::rename(&state_path, dir.join(format!("{STATE_FILE}.bak")));
                StateFile::default()
            }),
            Err(_) => StateFile::default(),
        };

        Ok(Self {
            inner: Arc::new(Inner {
                app,
                scheduler,
                jobs: AsyncMutex::new(HashMap::new()),
                state: Mutex::new(state),
                state_path,
            }),
        })
    }

    pub async fn start(&self) -> Result<(), AppError> {
        self.inner
            .scheduler
            .start()
            .await
            .map_err(|e| AppError::Scheduler(format!("Scheduler start failed: {e}")))
    }

    /// Reprograma al arrancar todos los workflows que estaban activos. No reinicia
    /// los contadores de `max_runs`.
    pub async fn restore(&self) {
        let active: Vec<Workflow> = {
            let mut state = self.inner.state.lock().unwrap_or_else(|e| e.into_inner());
            // Las entradas ya expiradas/completadas no se restauran (ya se avisó al usuario).
            state.entries.retain(|_, e| e.status == ScheduleStatus::Active);
            state.entries.values().map(|e| e.workflow.clone()).collect()
        };
        self.inner.persist();

        for workflow in active {
            let id = workflow.id.clone();
            let name = workflow.name.clone();
            match self.inner.register_job(&workflow).await {
                Ok(()) => tracing::info!("Scheduler: workflow '{name}' restaurado"),
                Err(e) => tracing::error!("Scheduler: no se pudo restaurar '{name}' ({id}): {e}"),
            }
        }
    }

    /// Programa (o reprograma) un workflow. Es idempotente: si ya había un job para
    /// este workflow se elimina primero. El contador de ejecuciones se reinicia.
    pub async fn schedule_workflow(&self, workflow: Workflow) -> Result<(), AppError> {
        let default_tz = crate::storage::config::get_default_timezone(&self.inner.app);
        let parsed = parse_schedule(&workflow, &default_tz)?;
        if let Some(exp) = parsed.expires_at {
            if exp <= Utc::now() {
                return Err(AppError::InvalidConfig("La fecha de expiración ya pasó".into()));
            }
        }

        let id = workflow.id.clone();
        self.inner.remove_job(&id).await?;

        // El estado se inserta ANTES de registrar el job para que un tick inmediato lo encuentre.
        {
            let mut state = self.inner.state.lock().unwrap_or_else(|e| e.into_inner());
            state.entries.insert(
                id.clone(),
                ScheduleEntry { workflow: workflow.clone(), runs: 0, status: ScheduleStatus::Active },
            );
        }
        if let Err(e) = self.inner.register_job(&workflow).await {
            self.inner.state.lock().unwrap_or_else(|e| e.into_inner()).entries.remove(&id);
            return Err(e);
        }
        self.inner.persist();
        self.inner.emit_status(&id, "scheduled");
        Ok(())
    }

    pub async fn unschedule_workflow(&self, workflow_id: &str) -> Result<(), AppError> {
        let had_job = self.inner.remove_job(workflow_id).await?;
        let had_entry = {
            let mut state = self.inner.state.lock().unwrap_or_else(|e| e.into_inner());
            state.entries.remove(workflow_id).is_some()
        };
        if had_entry {
            self.inner.persist();
        }
        if had_job || had_entry {
            self.inner.emit_status(workflow_id, "unscheduled");
        }
        Ok(())
    }

    pub async fn list_scheduled(&self) -> Vec<String> {
        self.inner.jobs.lock().await.keys().cloned().collect()
    }

    /// Borra todo el estado persistido (factory reset).
    pub fn purge_state_file(app: &AppHandle) {
        if let Ok(dir) = app.path().app_data_dir() {
            let _ = std::fs::remove_file(dir.join(STATE_FILE));
        }
    }
}

impl Inner {
    fn persist(&self) {
        let content = {
            let state = self.state.lock().unwrap_or_else(|e| e.into_inner());
            match serde_json::to_string_pretty(&*state) {
                Ok(c) => c,
                Err(e) => {
                    tracing::error!("Scheduler: no se pudo serializar el estado: {e}");
                    return;
                }
            }
        };
        if let Err(e) = write_atomic(&self.state_path, &content) {
            tracing::error!("Scheduler: no se pudo guardar {STATE_FILE}: {e}");
        }
    }

    fn emit_status(&self, workflow_id: &str, status: &'static str) {
        let _ = self.app.emit(
            "workflow://scheduler-status",
            SchedulerStatusEvent { workflow_id: workflow_id.to_string(), status },
        );
    }

    /// Quita el job de cron (si existe). Devuelve si había uno.
    async fn remove_job(&self, workflow_id: &str) -> Result<bool, AppError> {
        let uuid = self.jobs.lock().await.remove(workflow_id);
        match uuid {
            Some(uuid) => {
                self.scheduler
                    .remove(&uuid)
                    .await
                    .map_err(|e| AppError::Scheduler(format!("Failed to remove job: {e}")))?;
                Ok(true)
            }
            None => Ok(false),
        }
    }

    /// Crea el job en el scheduler (sin tocar el estado persistido).
    async fn register_job(self: &Arc<Self>, workflow: &Workflow) -> Result<(), AppError> {
        let default_tz = crate::storage::config::get_default_timezone(&self.app);
        let parsed = parse_schedule(workflow, &default_tz)?;
        let workflow_id = workflow.id.clone();

        let inner = Arc::clone(self);
        let id_for_job = workflow_id.clone();
        let job = Job::new_async_tz(parsed.cron_expr.as_str(), parsed.tz, move |_uuid, _lock| {
            let inner = Arc::clone(&inner);
            let id = id_for_job.clone();
            Box::pin(async move { inner.on_tick(&id).await })
        })
        .map_err(|e| AppError::InvalidConfig(format!("Expresión cron inválida '{}': {e}", parsed.cron_expr)))?;

        let uuid = self
            .scheduler
            .add(job)
            .await
            .map_err(|e| AppError::Scheduler(format!("Failed to add job: {e}")))?;
        self.jobs.lock().await.insert(workflow_id, uuid);
        Ok(())
    }

    /// Se ejecuta en cada tick del cron: aplica las reglas de fechas / máximo de
    /// ejecuciones antes de lanzar el workflow.
    async fn on_tick(self: &Arc<Self>, workflow_id: &str) {
        let (workflow, runs_so_far) = {
            let state = self.state.lock().unwrap_or_else(|e| e.into_inner());
            match state.entries.get(workflow_id) {
                Some(e) if e.status == ScheduleStatus::Active => (e.workflow.clone(), e.runs),
                _ => return,
            }
        };

        let default_tz = crate::storage::config::get_default_timezone(&self.app);
        let parsed = match parse_schedule(&workflow, &default_tz) {
            Ok(p) => p,
            Err(e) => {
                tracing::error!("Scheduler: configuración inválida para '{}': {e}", workflow.name);
                return;
            }
        };

        let now = Utc::now();
        if parsed.starts_at.map(|s| now < s).unwrap_or(false) {
            tracing::debug!("Scheduler: '{}' aún no inicia (starts_at), tick ignorado", workflow.name);
            return;
        }
        if parsed.expires_at.map(|x| now >= x).unwrap_or(false) {
            self.finish(workflow_id, ScheduleStatus::Expired);
            return;
        }
        if parsed.max_runs.map(|m| runs_so_far >= m).unwrap_or(false) {
            self.finish(workflow_id, ScheduleStatus::Completed);
            return;
        }

        // Política de solapamiento: skip.
        if runs::is_running(&self.app, workflow_id) {
            tracing::warn!("Scheduler: '{}' sigue ejecutándose; tick omitido", workflow.name);
            return;
        }

        let _ = self.app.emit("workflow://started-tick", TickEvent { workflow_id: workflow_id.to_string() });
        match runs::start_run(&self.app, workflow, "cron") {
            Ok(()) => {
                let reached_max = {
                    let mut state = self.state.lock().unwrap_or_else(|e| e.into_inner());
                    match state.entries.get_mut(workflow_id) {
                        Some(entry) => {
                            entry.runs += 1;
                            parsed.max_runs.map(|m| entry.runs >= m).unwrap_or(false)
                        }
                        None => false,
                    }
                };
                self.persist();
                if reached_max {
                    // Esta fue la última ejecución permitida: desprogramamos ya.
                    self.finish(workflow_id, ScheduleStatus::Completed);
                }
            }
            Err(AppError::AlreadyRunning(_)) => {}
            Err(e) => tracing::error!("Scheduler: no se pudo lanzar el workflow {workflow_id}: {e}"),
        }
    }

    /// Marca el schedule como terminado (`expired` / `completed`) y quita el job.
    fn finish(self: &Arc<Self>, workflow_id: &str, status: ScheduleStatus) {
        {
            let mut state = self.state.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(entry) = state.entries.get_mut(workflow_id) {
                entry.status = status;
            }
        }
        self.persist();

        let label = match status {
            ScheduleStatus::Expired => "expired",
            ScheduleStatus::Completed => "completed",
            ScheduleStatus::Active => "scheduled",
        };
        tracing::info!("Scheduler: workflow {workflow_id} → {label}");

        // Se quita el job desde otra tarea: no se elimina un job desde dentro de su propio callback.
        let inner = Arc::clone(self);
        let id = workflow_id.to_string();
        tauri::async_runtime::spawn(async move {
            if let Err(e) = inner.remove_job(&id).await {
                tracing::error!("Scheduler: no se pudo quitar el job de {id}: {e}");
            }
            inner.emit_status(&id, label);
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::workflow::Workflow;

    fn cron_workflow(
        expr: &str,
        tz: Option<&str>,
        starts: Option<&str>,
        expires: Option<&str>,
        max: Option<u64>,
    ) -> Workflow {
        Workflow {
            id: "wf".into(),
            name: "wf".into(),
            description: None,
            path: None,
            metadata: None,
            trigger: Trigger::Cron {
                expression: expr.into(),
                timezone: tz.map(String::from),
                starts_at: starts.map(String::from),
                expires_at: expires.map(String::from),
                max_runs: max,
            },
            nodes: vec![],
            edges: vec![],
        }
    }

    #[test]
    fn null_fields_mean_unbounded() {
        let p = parse_schedule(&cron_workflow("0 9 * * *", None, None, None, None), "America/Bogota").unwrap();
        assert_eq!(p.cron_expr, "0 0 9 * * *");
        assert!(p.starts_at.is_none() && p.expires_at.is_none() && p.max_runs.is_none());
        assert_eq!(p.tz, chrono_tz::America::Bogota);
    }

    #[test]
    fn empty_strings_are_treated_as_null() {
        let p = parse_schedule(&cron_workflow("0 9 * * *", Some(""), Some(""), Some("  "), None), "America/Bogota").unwrap();
        assert!(p.starts_at.is_none() && p.expires_at.is_none());
        assert_eq!(p.tz, chrono_tz::America::Bogota);
    }

    #[test]
    fn naive_dates_use_the_trigger_timezone() {
        // 09:00 en Bogotá (UTC-5) == 14:00 UTC
        let p = parse_schedule(
            &cron_workflow("0 9 * * *", Some("America/Bogota"), Some("2030-01-01T09:00"), None, None),
            "UTC",
        )
        .unwrap();
        assert_eq!(p.starts_at.unwrap().to_rfc3339(), "2030-01-01T14:00:00+00:00");
    }

    #[test]
    fn rfc3339_offset_is_respected() {
        let p = parse_schedule(
            &cron_workflow("0 9 * * *", None, Some("2030-01-01T09:00:00Z"), None, None),
            "America/Bogota",
        )
        .unwrap();
        assert_eq!(p.starts_at.unwrap().to_rfc3339(), "2030-01-01T09:00:00+00:00");
    }

    #[test]
    fn rejects_bad_input() {
        assert!(parse_schedule(&cron_workflow("0 9 * * *", Some("Mars/Base"), None, None, None), "UTC").is_err());
        assert!(parse_schedule(&cron_workflow("0 9 * * *", None, Some("mañana"), None, None), "UTC").is_err());
        assert!(parse_schedule(&cron_workflow("0 9 * * *", None, None, None, Some(0)), "UTC").is_err());
        assert!(parse_schedule(&cron_workflow("", None, None, None, None), "UTC").is_err());
        assert!(parse_schedule(
            &cron_workflow("0 9 * * *", None, Some("2030-02-01T00:00"), Some("2030-01-01T00:00"), None),
            "UTC"
        )
        .is_err());
    }

    #[test]
    fn manual_trigger_is_not_schedulable() {
        let mut wf = cron_workflow("0 9 * * *", None, None, None, None);
        wf.trigger = Trigger::Manual { config: None };
        assert!(parse_schedule(&wf, "UTC").is_err());
    }
}
