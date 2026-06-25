use async_trait::async_trait;
use serde::Deserialize;
use serde_json::Value;

use crate::engine::context::PipelineContext;
use crate::errors::AppError;
use crate::models::execution::{OutputMetadata, StepOutput};

use super::Step;

/// Configuración para un step de envío de WhatsApp
#[derive(Debug, Clone, Deserialize)]
pub struct WhatsAppConfig {
    /// ID del chat destino
    pub chat_id: String,
    /// Template del mensaje con soporte para variables (ej: "🕐 {{time}} / {{step_2.data}}")
    pub message_template: String,
}

pub struct WhatsAppStep {
    config: WhatsAppConfig,
}

impl WhatsAppStep {
    pub fn from_config(config: &Value) -> Result<Self, AppError> {
        let config: WhatsAppConfig = serde_json::from_value(config.clone()).map_err(|e| {
            AppError::InvalidConfig(format!("WhatsApp step config inválida: {}", e))
        })?;
        Ok(Self { config })
    }
}

#[async_trait]
impl Step for WhatsAppStep {
    fn step_type(&self) -> &'static str {
        "whatsapp"
    }

    async fn execute(&self, context: &PipelineContext) -> Result<StepOutput, AppError> {
        // Resolver templates en el mensaje
        let resolved_message = context.resolve_template(&self.config.message_template);

        // TODO: obtener referencia al WhatsAppCore desde el state/context
        // Por ahora, log del mensaje que se enviaría
        println!(
            "[WhatsApp] Enviando a {}: {}",
            self.config.chat_id, resolved_message
        );

        Ok(StepOutput {
            data: Value::Object({
                let mut map = serde_json::Map::new();
                map.insert("chat_id".into(), Value::String(self.config.chat_id.clone()));
                map.insert("message".into(), Value::String(resolved_message));
                map.insert("sent".into(), Value::Bool(true));
                map
            }),
            metadata: OutputMetadata {
                status_code: None,
                headers: None,
                duration_ms: 0,
                timestamp: chrono::Utc::now().to_rfc3339(),
            },
        })
    }

    fn validate_config(&self) -> Result<(), AppError> {
        if self.config.chat_id.is_empty() {
            return Err(AppError::InvalidConfig(
                "chat_id no puede estar vacío".into(),
            ));
        }
        if self.config.message_template.is_empty() {
            return Err(AppError::InvalidConfig(
                "message_template no puede estar vacío".into(),
            ));
        }
        Ok(())
    }
}
