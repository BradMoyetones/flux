use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, Clone, Default, PartialEq)]
pub struct WorkflowMetadata {
    pub last_execution: Option<String>,
    pub total_executions: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Workflow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub path: Option<String>,
    #[serde(default)]
    pub metadata: Option<WorkflowMetadata>,
    pub trigger: Trigger,
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Trigger {
    Manual {
        #[serde(default)]
        config: Option<Value>, // for backwards compatibility
    },
    Cron {
        expression: String,
        timezone: Option<String>,
        starts_at: Option<String>,
        expires_at: Option<String>,
        max_runs: Option<u64>,
    },
    Webhook {
        path: String,
        method: Option<String>,
    },
}

impl Default for Trigger {
    fn default() -> Self {
        Trigger::Manual { config: None }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct XYPosition {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Node {
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(rename = "type")]
    pub node_type: String, // e.g., "http", "whatsapp", "excel"
    pub label: String,
    pub config: Value,
    pub position: Option<XYPosition>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Edge {
    pub id: String,
    pub source: String, // source Node ID
    pub target: String, // target Node ID
    pub source_handle: Option<String>,
    pub target_handle: Option<String>,
}
