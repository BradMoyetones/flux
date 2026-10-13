use std::collections::HashMap;
use std::sync::Arc;
use serde_json::Value;
use crate::core::context::ExecutionContext;

#[async_trait::async_trait]
pub trait NodePlugin: Send + Sync {
    /// Devuelve el identificador único del plugin (ej. "http")
    fn identifier(&self) -> &'static str;
    
    /// Ejecuta el plugin tomando la configuración del nodo y el contexto actual
    async fn execute(&self, ctx: &ExecutionContext, config: &Value) -> Result<Value, String>;
}

pub struct PluginRegistry {
    plugins: HashMap<String, Arc<dyn NodePlugin>>,
}

impl PluginRegistry {
    pub fn new() -> Self {
        Self {
            plugins: HashMap::new(),
        }
    }

    pub fn register(&mut self, plugin: Arc<dyn NodePlugin>) {
        self.plugins.insert(plugin.identifier().to_string(), plugin);
    }

    pub fn get(&self, id: &str) -> Option<Arc<dyn NodePlugin>> {
        self.plugins.get(id).cloned()
    }
}

// Global registry instantiation could be managed via Tauri state
