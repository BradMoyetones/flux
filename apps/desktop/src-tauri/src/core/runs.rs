//! Registro de ejecuciones en curso (manuales y programadas).
//!
//! Un único punto de entrada para lanzar y detener runs, de modo que el estado
//! "ejecutando" sea coherente sin importar quién los dispare (botón, cron, etc.).

use std::sync::Arc;
use tauri::{AppHandle, Manager};

use crate::core::executor::execute_workflow;
use crate::errors::AppError;
use crate::models::workflow::Workflow;
use crate::state::{ActiveRun, AppState};

fn app_state(app: &AppHandle) -> Result<tauri::State<'_, Arc<AppState>>, AppError> {
    app.try_state::<Arc<AppState>>()
        .ok_or_else(|| AppError::Internal("AppState no disponible".into()))
}

pub fn is_running(app: &AppHandle, workflow_id: &str) -> bool {
    app.try_state::<Arc<AppState>>()
        .map(|s| {
            s.active_executions
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .contains_key(workflow_id)
        })
        .unwrap_or(false)
}

/// Lanza un workflow en segundo plano. Política de solapamiento: **skip** — si ya hay
/// un run de ese workflow en curso devuelve `AlreadyRunning` y no lanza otro.
pub fn start_run(app: &AppHandle, workflow: Workflow, trigger: &str) -> Result<(), AppError> {
    let state = app_state(app)?;
    let workflow_id = workflow.id.clone();
    let run_id = uuid::Uuid::new_v4().to_string();

    // Mantenemos el lock durante spawn+insert: si el workflow termina instantáneamente,
    // su tarea de limpieza espera a que la entrada exista antes de poder borrarla
    // (evita la entrada fantasma "ejecutando" para siempre).
    let mut active = state.active_executions.lock().unwrap_or_else(|e| e.into_inner());
    if active.contains_key(&workflow_id) {
        return Err(AppError::AlreadyRunning(workflow.name.clone()));
    }

    let app_task = app.clone();
    let id_task = workflow_id.clone();
    let run_id_task = run_id.clone();
    let trigger = trigger.to_string();
    let handle = tauri::async_runtime::spawn(async move {
        if let Err(e) = execute_workflow(app_task.clone(), workflow, run_id_task.clone(), trigger).await {
            tracing::warn!("Workflow {id_task} terminó con error: {e}");
        }

        if let Some(state) = app_task.try_state::<Arc<AppState>>() {
            let mut active = state.active_executions.lock().unwrap_or_else(|e| e.into_inner());
            // Solo borramos NUESTRA entrada (no la de un run posterior del mismo workflow).
            if active.get(&id_task).map(|r| r.run_id == run_id_task).unwrap_or(false) {
                active.remove(&id_task);
            }
        }
    });

    active.insert(workflow_id, ActiveRun { run_id, handle });
    Ok(())
}

/// Detiene el run en curso de un workflow. Idempotente: devuelve `false` si no había
/// nada corriendo. Los nodos pendientes/en curso se marcan `cancelled` (ver `RunGuard`).
pub fn stop_run(app: &AppHandle, workflow_id: &str) -> Result<bool, AppError> {
    let state = app_state(app)?;
    let run = state
        .active_executions
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .remove(workflow_id);

    match run {
        Some(run) => {
            run.handle.abort();
            Ok(true)
        }
        None => Ok(false),
    }
}
