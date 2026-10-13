use tauri::{AppHandle, Emitter};
use crate::models::runtime::{NodeExecutionEvent, WorkflowExecutionEvent};

pub fn emit_node_event(app: &AppHandle, event: &NodeExecutionEvent) {
    let _ = app.emit("workflow://node-status", event);
}

pub fn emit_workflow_event(app: &AppHandle, event: &WorkflowExecutionEvent) {
    let _ = app.emit("workflow://status", event);
}
