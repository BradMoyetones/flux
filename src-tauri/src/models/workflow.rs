use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Workflow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub trigger: Trigger,
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Trigger {
    #[serde(rename = "type")]
    pub trigger_type: String, // e.g., "manual", "cron", "webhook"
    pub config: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct XYPosition {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Node {
    pub id: String,
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
