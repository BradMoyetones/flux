use serde_json::Value;
use std::collections::HashMap;
use tauri::AppHandle;

#[derive(Clone)]
pub struct ExecutionContext {
    pub variables: HashMap<String, Value>,
    pub app: AppHandle,
}

impl ExecutionContext {
    pub fn new(app: AppHandle) -> Self {
        Self {
            variables: HashMap::new(),
            app,
        }
    }

    pub fn set_node_result(&mut self, node_id: &str, result: Value) {
        self.variables.insert(node_id.to_string(), result);
    }

    pub fn get_node_result(&self, node_id: &str) -> Option<&Value> {
        self.variables.get(node_id)
    }
}
