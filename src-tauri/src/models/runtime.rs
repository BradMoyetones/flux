use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum NodeStatus {
    Pending,
    Running,
    Success,
    Error,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NodeExecutionEvent {
    pub workflow_id: String,
    pub node_id: String,
    pub status: NodeStatus,
    pub result: Option<serde_json::Value>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkflowExecutionEvent {
    pub workflow_id: String,
    pub status: NodeStatus,
}
