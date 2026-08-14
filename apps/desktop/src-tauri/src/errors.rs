use serde::ser::SerializeStruct;
use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Step execution failed in '{step_id}': {message}")]
    StepExecution { step_id: String, message: String },

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),

    #[error("HTTP error: {0}")]
    HttpClient(String),

    #[error("WhatsApp error: {0}")]
    WhatsApp(String),

    #[error("Scheduler error: {0}")]
    Scheduler(String),

    #[error("Storage error: {0}")]
    Storage(String),

    #[error("Sidecar error: {0}")]
    Sidecar(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut state = serializer.serialize_struct("AppError", 3)?;
        
        let (code, category) = match self {
            AppError::StepExecution { .. } => ("STEP_EXECUTION", "execution"),
            AppError::InvalidConfig(_) => ("INVALID_CONFIG", "config"),
            AppError::HttpClient(_) => ("HTTP_CLIENT", "network"),
            AppError::WhatsApp(_) => ("WHATSAPP", "sidecar"),
            AppError::Scheduler(_) => ("SCHEDULER", "scheduler"),
            AppError::Storage(_) => ("STORAGE", "storage"),
            AppError::Sidecar(_) => ("SIDECAR", "sidecar"),
            AppError::Internal(_) => ("INTERNAL", "system"),
        };

        state.serialize_field("code", code)?;
        state.serialize_field("category", category)?;
        state.serialize_field("message", &self.to_string())?;
        state.end()
    }
}
