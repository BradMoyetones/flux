pub mod registry;
pub mod http;
pub mod whatsapp;

use std::sync::Arc;
use registry::PluginRegistry;

/// Construye el registry con todos los plugins compilados en la app.
/// Se crea UNA vez al arrancar (vive en `AppState`), no en cada ejecución.
pub fn build_registry() -> PluginRegistry {
    let mut registry = PluginRegistry::new();
    registry.register(Arc::new(http::plugin::HttpPlugin));
    registry.register(Arc::new(whatsapp::plugin::WhatsAppPlugin));
    registry
}
