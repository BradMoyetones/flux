pub mod data_transform;
pub mod http_request;
pub mod whatsapp;

use async_trait::async_trait;

use crate::engine::context::PipelineContext;
use crate::errors::AppError;
use crate::models::execution::StepOutput;
use crate::models::workflow::{StepConfig, StepType};

/// Trait que todos los tipos de step deben implementar.
/// Para agregar un nuevo tipo de step, crea un archivo en steps/ e implementa este trait.
#[async_trait]
pub trait Step: Send + Sync {
    /// Identificador del tipo de step
    fn step_type(&self) -> &'static str;

    /// Ejecuta el step con acceso al contexto del pipeline
    async fn execute(&self, context: &PipelineContext) -> Result<StepOutput, AppError>;

    /// Valida que la configuración sea correcta antes de ejecutar
    fn validate_config(&self) -> Result<(), AppError>;
}

/// Crea la instancia correcta de Step a partir de un StepConfig
pub fn create_step(config: &StepConfig) -> Result<Box<dyn Step>, AppError> {
    match config.step_type {
        StepType::HttpRequest => Ok(Box::new(http_request::HttpRequestStep::from_config(
            &config.config,
        )?)),
        StepType::DataTransform => Ok(Box::new(data_transform::DataTransformStep::from_config(
            &config.config,
        )?)),
        StepType::WhatsApp => Ok(Box::new(whatsapp::WhatsAppStep::from_config(
            &config.config,
        )?)),
    }
}
