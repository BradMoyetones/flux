use async_trait::async_trait;
use serde::Deserialize;
use serde_json::Value;

use crate::engine::context::PipelineContext;
use crate::errors::AppError;
use crate::models::execution::{OutputMetadata, StepOutput};

use super::Step;

/// Tipos de transformación soportados
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TransformType {
    /// Extrae un valor de JSON usando un path (ej: "data.items[0].price")
    JsonPath,
    /// Aplica una regex para extraer datos
    Regex,
    /// Construye un string con templates (ej: "Precio: {{value}}")
    Template,
}

/// Configuración para un step de transformación de datos
#[derive(Debug, Clone, Deserialize)]
pub struct DataTransformConfig {
    /// Referencia al output de otro step (ej: "step_1")
    pub input_ref: String,
    /// Tipo de transformación
    pub transform_type: TransformType,
    /// Expresión o patrón según el transform_type
    pub expression: String,
}

pub struct DataTransformStep {
    config: DataTransformConfig,
}

impl DataTransformStep {
    pub fn from_config(config: &Value) -> Result<Self, AppError> {
        let config: DataTransformConfig = serde_json::from_value(config.clone())
            .map_err(|e| AppError::InvalidConfig(format!("Transform step config inválida: {}", e)))?;
        Ok(Self { config })
    }
}

#[async_trait]
impl Step for DataTransformStep {
    fn step_type(&self) -> &'static str {
        "data_transform"
    }

    async fn execute(&self, context: &PipelineContext) -> Result<StepOutput, AppError> {
        let input = context
            .get_step_output(&self.config.input_ref)
            .ok_or_else(|| {
                AppError::StepExecution {
                    step_id: self.config.input_ref.clone(),
                    message: "Output del step referenciado no encontrado".into(),
                }
            })?;

        let result = match self.config.transform_type {
            TransformType::JsonPath => {
                // TODO: implementar extracción JSON path real
                // Por ahora, intenta navegar el JSON con el expression como key simple
                extract_json_value(&input.data, &self.config.expression)
            }
            TransformType::Regex => {
                // TODO: implementar extracción regex
                Value::String(format!("[regex pending: {}]", self.config.expression))
            }
            TransformType::Template => {
                // Resolver template contra el context completo
                let resolved = context.resolve_template(&self.config.expression);
                Value::String(resolved)
            }
        };

        Ok(StepOutput {
            data: result,
            metadata: OutputMetadata {
                status_code: None,
                headers: None,
                duration_ms: 0,
                timestamp: chrono::Utc::now().to_rfc3339(),
            },
        })
    }

    fn validate_config(&self) -> Result<(), AppError> {
        if self.config.input_ref.is_empty() {
            return Err(AppError::InvalidConfig("input_ref no puede estar vacío".into()));
        }
        if self.config.expression.is_empty() {
            return Err(AppError::InvalidConfig("expression no puede estar vacía".into()));
        }
        Ok(())
    }
}

/// Extrae un valor de un JSON usando un path separado por puntos
fn extract_json_value(data: &Value, path: &str) -> Value {
    let parts: Vec<&str> = path.split('.').collect();
    let mut current = data;

    for part in parts {
        match current {
            Value::Object(map) => {
                if let Some(val) = map.get(part) {
                    current = val;
                } else {
                    return Value::Null;
                }
            }
            _ => return Value::Null,
        }
    }

    current.clone()
}
