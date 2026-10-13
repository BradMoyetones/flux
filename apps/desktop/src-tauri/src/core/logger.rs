use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ConsoleLogEntry {
    pub timestamp: String,
    pub level: LogLevel,
    pub workflow_id: String,
    pub node_id: Option<String>,
    pub message: String,
    pub data: Option<Value>,
}

pub fn emit_console_log(app: &AppHandle, entry: ConsoleLogEntry) {
    let _ = app.emit("workflow://console-log", &entry);
}

pub fn log_info(app: &AppHandle, workflow_id: &str, node_id: Option<&str>, message: &str) {
    let entry = ConsoleLogEntry {
        timestamp: Utc::now().to_rfc3339(),
        level: LogLevel::Info,
        workflow_id: workflow_id.to_string(),
        node_id: node_id.map(|s| s.to_string()),
        message: message.to_string(),
        data: None,
    };
    emit_console_log(app, entry);
}

pub fn log_warn(app: &AppHandle, workflow_id: &str, node_id: Option<&str>, message: &str) {
    let entry = ConsoleLogEntry {
        timestamp: Utc::now().to_rfc3339(),
        level: LogLevel::Warn,
        workflow_id: workflow_id.to_string(),
        node_id: node_id.map(|s| s.to_string()),
        message: message.to_string(),
        data: None,
    };
    emit_console_log(app, entry);
}

pub fn log_error(app: &AppHandle, workflow_id: &str, node_id: Option<&str>, message: &str, data: Option<Value>) {
    let entry = ConsoleLogEntry {
        timestamp: Utc::now().to_rfc3339(),
        level: LogLevel::Error,
        workflow_id: workflow_id.to_string(),
        node_id: node_id.map(|s| s.to_string()),
        message: message.to_string(),
        data,
    };
    emit_console_log(app, entry);
}

pub fn log_debug(app: &AppHandle, workflow_id: &str, node_id: Option<&str>, message: &str) {
    let entry = ConsoleLogEntry {
        timestamp: Utc::now().to_rfc3339(),
        level: LogLevel::Debug,
        workflow_id: workflow_id.to_string(),
        node_id: node_id.map(|s| s.to_string()),
        message: message.to_string(),
        data: None,
    };
    emit_console_log(app, entry);
}
