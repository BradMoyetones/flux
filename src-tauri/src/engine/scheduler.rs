use std::collections::HashMap;
use std::sync::Arc;

use tokio::sync::Mutex;

use crate::errors::AppError;
use crate::models::workflow::Workflow;

/// Gestión de CronJobs para ejecución programada de workflows.
/// Cada workflow con un campo `schedule` (cron expression) puede ser registrado
/// para ejecutarse automáticamente.
pub struct CronScheduler {
    /// Workflows programados: workflow_id → handle del job
    scheduled_jobs: HashMap<String, tokio::task::JoinHandle<()>>,
}

impl CronScheduler {
    pub fn new() -> Self {
        Self {
            scheduled_jobs: HashMap::new(),
        }
    }

    /// Programa un workflow para ejecución recurrente según su cron expression.
    ///
    /// # Argumentos
    /// - `workflow`: El workflow a programar (debe tener `schedule` definido)
    ///
    /// # Retorna
    /// - `Ok(())` si se programó exitosamente
    /// - `Err(AppError::Scheduler)` si la expression es inválida o no tiene schedule
    pub fn schedule_workflow(&mut self, workflow: Arc<Mutex<Workflow>>) -> Result<(), AppError> {
        let wf = workflow.blocking_lock();
        let workflow_id = wf.id.clone();
        let cron_expr = wf
            .schedule
            .as_ref()
            .ok_or_else(|| {
                AppError::Scheduler(format!(
                    "Workflow '{}' no tiene schedule definido",
                    workflow_id
                ))
            })?
            .clone();
        drop(wf);

        // Cancelar job anterior si existe
        self.cancel_workflow(&workflow_id);

        // TODO: Implementar scheduling real con tokio-cron-scheduler
        // Por ahora, solo log
        println!(
            "[Scheduler] Workflow '{}' programado con cron: {}",
            workflow_id, cron_expr
        );

        let handle = tokio::spawn(async move {
            // TODO: loop con cron timing real
            // Por ahora es un placeholder que no ejecuta nada
            println!("[Scheduler] Job placeholder para workflow en ejecución");
        });

        self.scheduled_jobs.insert(workflow_id, handle);
        Ok(())
    }

    /// Cancela la ejecución programada de un workflow
    pub fn cancel_workflow(&mut self, workflow_id: &str) -> bool {
        if let Some(handle) = self.scheduled_jobs.remove(workflow_id) {
            handle.abort();
            println!("[Scheduler] Job '{}' cancelado", workflow_id);
            true
        } else {
            false
        }
    }

    /// Lista los IDs de workflows actualmente programados
    pub fn list_scheduled(&self) -> Vec<String> {
        self.scheduled_jobs.keys().cloned().collect()
    }

    /// Cancela todos los jobs programados
    pub fn cancel_all(&mut self) {
        for (id, handle) in self.scheduled_jobs.drain() {
            handle.abort();
            println!("[Scheduler] Job '{}' cancelado", id);
        }
    }
}
