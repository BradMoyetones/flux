use std::collections::HashMap;

use async_trait::async_trait;
use serde::Deserialize;
use serde_json::Value;

use crate::engine::context::PipelineContext;
use crate::errors::AppError;
use crate::models::execution::StepOutput;
use crate::services::http_client::HttpClient;

use super::Step;

/// Configuración para un step de petición HTTP
#[derive(Debug, Clone, Deserialize)]
pub struct HttpRequestConfig {
    pub method: String,           // GET, POST, PUT, DELETE, etc.
    pub url: String,              // Soporta templates: "https://api.com/{{step_1.data.id}}"
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<Value>,
}

pub struct HttpRequestStep {
    config: HttpRequestConfig,
}

impl HttpRequestStep {
    pub fn from_config(config: &Value) -> Result<Self, AppError> {
        let config: HttpRequestConfig = serde_json::from_value(config.clone())
            .map_err(|e| AppError::InvalidConfig(format!("HTTP step config inválida: {}", e)))?;
        Ok(Self { config })
    }
}

#[async_trait]
impl Step for HttpRequestStep {
    fn step_type(&self) -> &'static str {
        "http_request"
    }

    async fn execute(&self, context: &PipelineContext) -> Result<StepOutput, AppError> {
        // Resolver templates en la URL y headers contra el context
        let resolved_url = context.resolve_template(&self.config.url);

        let resolved_headers = self.config.headers.as_ref().map(|hdrs| {
            hdrs.iter()
                .map(|(k, v)| (k.clone(), context.resolve_template(v)))
                .collect()
        });

        let resolved_body = self.config.body.clone(); // TODO: resolver templates en body

        let client = HttpClient::new();
        client
            .execute_request(&resolved_url, &self.config.method, resolved_headers, resolved_body)
            .await
    }

    fn validate_config(&self) -> Result<(), AppError> {
        if self.config.url.is_empty() {
            return Err(AppError::InvalidConfig("URL no puede estar vacía".into()));
        }
        if self.config.method.is_empty() {
            return Err(AppError::InvalidConfig("Método HTTP no puede estar vacío".into()));
        }
        Ok(())
    }
}
