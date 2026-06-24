use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workflow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub steps: Vec<StepConfig>,
    pub schedule: Option<String>, // Cron expression, ej: "0 */5 * * *"
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepConfig {
    pub id: String,
    pub name: String,
    pub step_type: StepType,
    pub config: serde_json::Value,
    pub order: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StepType {
    HttpRequest,
    DataTransform,
    WhatsApp,
}
