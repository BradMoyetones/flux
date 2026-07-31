use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone, Default)]
pub struct ExecutionContext {
    pub variables: HashMap<String, Value>,
}

impl ExecutionContext {
    pub fn new() -> Self {
        Self {
            variables: HashMap::new(),
        }
    }

    pub fn set_node_result(&mut self, node_id: &str, result: Value) {
        self.variables.insert(node_id.to_string(), result);
    }

    pub fn get_node_result(&self, node_id: &str) -> Option<&Value> {
        self.variables.get(node_id)
    }
}
