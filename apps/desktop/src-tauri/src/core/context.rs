use serde_json::Value;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use tauri::AppHandle;
use reqwest::cookie::Jar;
use crate::state::GlobalVariable;

#[derive(Clone)]
pub struct ExecutionContext {
    pub variables: Arc<RwLock<HashMap<String, Value>>>,
    pub cookie_jar: Arc<Jar>,
    pub custom_variables: Vec<GlobalVariable>,
    pub app: AppHandle,
}

impl ExecutionContext {
    pub fn new(app: AppHandle, custom_variables: Vec<GlobalVariable>) -> Self {
        Self {
            variables: Arc::new(RwLock::new(HashMap::new())),
            cookie_jar: Arc::new(Jar::default()),
            custom_variables,
            app,
        }
    }

    pub fn set_node_result(&self, node_id: &str, result: Value) {
        if let Ok(mut vars) = self.variables.write() {
            vars.insert(node_id.to_string(), result);
        }
    }

    pub fn get_node_result(&self, node_id: &str) -> Option<Value> {
        if let Ok(vars) = self.variables.read() {
            vars.get(node_id).cloned()
        } else {
            None
        }
    }

    pub fn get_custom_variable(&self, key: &str) -> Option<String> {
        self.custom_variables.iter().find(|v| v.key == key).map(|v| v.value.clone())
    }
}
