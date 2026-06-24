use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepOutput {
    pub data: serde_json::Value,
    pub metadata: OutputMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutputMetadata {
    pub status_code: Option<u16>,
    pub headers: Option<std::collections::HashMap<String, String>>,
    pub duration_ms: u64,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepResult {
    pub step_id: String,
    pub step_name: String,
    pub status: StepStatus,
    pub output: Option<StepOutput>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StepStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Skipped,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub id: String,
    pub workflow_id: String,
    pub status: ExecutionStatus,
    pub steps_results: Vec<StepResult>,
    pub started_at: String,
    pub finished_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExecutionStatus {
    Running,
    Completed,
    Failed {
        step_id: String,
        error: String,
    },
    Cancelled,
}
