use std::sync::Arc;
use tokio::sync::RwLock;
use tokio_cron_scheduler::{JobScheduler, Job};
use std::collections::HashMap;
use uuid::Uuid;
use tauri::{AppHandle, Emitter};
use crate::models::workflow::{Workflow, Trigger};
use crate::core::executor::execute_workflow;
use crate::errors::AppError;

pub struct SchedulerService {
    scheduler: Arc<RwLock<JobScheduler>>,
    job_map: Arc<RwLock<HashMap<String, Uuid>>>,
    app: AppHandle,
}

impl SchedulerService {
    pub async fn new(app: AppHandle) -> Result<Self, AppError> {
        let scheduler = JobScheduler::new().await
            .map_err(|e| AppError::Scheduler(format!("Failed to create scheduler: {}", e)))?;
        
        Ok(Self {
            scheduler: Arc::new(RwLock::new(scheduler)),
            job_map: Arc::new(RwLock::new(HashMap::new())),
            app,
        })
    }

    pub async fn start(&self) -> Result<(), AppError> {
        self.scheduler.read().await.start().await
            .map_err(|e| AppError::Scheduler(format!("Scheduler start failed: {}", e)))
    }

    pub async fn schedule_workflow(&self, workflow: Workflow) -> Result<(), AppError> {
        if let Trigger::Cron { ref expression, .. } = workflow.trigger {
            let app_clone = self.app.clone();
            let wf_clone = workflow.clone();
            let wf_id = workflow.id.clone();

            let cron_expr = expression.clone();

            let job = Job::new_async(cron_expr.as_str(), move |_uuid, _lock| {
                let app = app_clone.clone();
                let wf = wf_clone.clone();
                Box::pin(async move {
                    if let Err(e) = execute_workflow(app, wf).await {
                        eprintln!("Scheduled workflow failed: {}", e);
                    }
                })
            }).map_err(|e| AppError::Scheduler(format!("Failed to create job: {}", e)))?;

            let uuid = self.scheduler.write().await.add(job).await
                .map_err(|e| AppError::Scheduler(format!("Failed to add job: {}", e)))?;
            
            self.job_map.write().await.insert(wf_id.clone(), uuid);

            #[derive(serde::Serialize, Clone)]
            struct SchedulerStatus {
                workflow_id: String,
                status: String,
            }

            let _ = self.app.emit("workflow://scheduler-status", SchedulerStatus {
                workflow_id: wf_id,
                status: "scheduled".to_string(),
            });
        }
        Ok(())
    }

    pub async fn unschedule_workflow(&self, workflow_id: &str) -> Result<(), AppError> {
        if let Some(uuid) = self.job_map.write().await.remove(workflow_id) {
            self.scheduler.write().await.remove(&uuid).await
                .map_err(|e| AppError::Scheduler(format!("Failed to remove job: {}", e)))?;

            #[derive(serde::Serialize, Clone)]
            struct SchedulerStatus {
                workflow_id: String,
                status: String,
            }

            let _ = self.app.emit("workflow://scheduler-status", SchedulerStatus {
                workflow_id: workflow_id.to_string(),
                status: "unscheduled".to_string(),
            });
        }
        Ok(())
    }

    pub async fn list_scheduled(&self) -> Vec<String> {
        self.job_map.read().await.keys().cloned().collect()
    }
}
