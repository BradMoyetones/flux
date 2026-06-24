use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Step execution failed in '{step_id}': {message}")]
    StepExecution { step_id: String, message: String },

    #[error("Workflow not found: {0}")]
    WorkflowNotFound(String),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),

    #[error("HTTP error: {0}")]
    HttpClient(String),

    #[error("WhatsApp error: {0}")]
    WhatsApp(String),

    #[error("Scheduler error: {0}")]
    Scheduler(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

// Serialización segura: no expone detalles internos al frontend
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
