use tauri::{AppHandle, command};
use crate::models::workflow::Workflow;
use crate::core::executor::execute_workflow;

#[command]
pub async fn cmd_execute_workflow(app: AppHandle, workflow: Workflow) -> Result<(), String> {
    // Spawn en tokio para no bloquear el hilo principal de Tauri
    tokio::spawn(async move {
        let _ = execute_workflow(app, workflow).await;
    });
    
    Ok(())
}
