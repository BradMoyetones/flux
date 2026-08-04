use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HttpNodeConfig {
    // ──── Basics ────
    pub url: String,
    pub method: HttpMethod,

    // ──── Headers ────
    #[serde(default)]
    pub headers: HashMap<String, String>,

    // ──── Body ────
    /// El body de la petición (soporta interpolación).
    pub body: Option<String>,
    /// Content-Type explícito. Se inyecta en los headers automáticamente si se omite allí.
    pub content_type: Option<String>,

    // ──── Authentication ────
    pub auth: Option<HttpAuth>,

    // ──── Behavior ────
    /// Timeout en milisegundos. Default: 30000 (30s).
    #[serde(default = "default_timeout")]
    pub timeout_ms: u64,

    /// Máximo de redirects a seguir. `0` = no seguir redirects. Default: 10.
    #[serde(default = "default_max_redirects")]
    pub max_redirects: u32,

    /// Si es `true`, el motor sigue redirects automáticamente (default).
    /// Si es `false`, se devuelve la respuesta tal cual sin seguirlos.
    #[serde(default = "default_follow_redirects")]
    pub follow_redirects: bool,

    // ──── SSL / TLS ────
    /// Si es `true`, desactiva la verificación de certificados SSL.
    /// Útil para APIs internas con certs auto-firmados.
    #[serde(default)]
    pub ignore_ssl_errors: bool,

    // ──── Proxy ────
    pub proxy: Option<HttpProxy>,

    // ──── Query Parameters ────
    /// Pares clave-valor que se adjuntan como query string: `?key=value&...`
    #[serde(default)]
    pub query_params: HashMap<String, String>,

    // ──── Response ────
    /// Cómo parsear la respuesta. Default: "auto" (intenta JSON, cae a texto).
    #[serde(default = "default_response_type")]
    pub response_type: ResponseType,

    // ──── Retry ────
    /// Número de reintentos en caso de fallo de red o 5xx. Default: 0.
    #[serde(default)]
    pub retry_count: u32,

    /// Delay entre reintentos en ms. Default: 1000.
    #[serde(default = "default_retry_delay")]
    pub retry_delay_ms: u64,

    // ──── Cookies ────
    /// Si es `true`, almacena cookies de la respuesta y las reenvía en el mismo workflow.
    #[serde(default)]
    pub persist_cookies: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "UPPERCASE")]
pub enum HttpMethod {
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Head,
    Options,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum HttpAuth {
    #[serde(rename = "basic")]
    Basic { username: String, password: String },
    #[serde(rename = "bearer")]
    Bearer { token: String },
    #[serde(rename = "apiKey")]
    ApiKey { key: String, value: String, location: ApiKeyLocation },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum ApiKeyLocation {
    Header,
    QueryParam,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HttpProxy {
    pub url: String,
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum ResponseType {
    Auto,
    Json,
    Text,
    Binary,
}

fn default_timeout() -> u64 { 30_000 }
fn default_max_redirects() -> u32 { 10 }
fn default_follow_redirects() -> bool { true }
fn default_response_type() -> ResponseType { ResponseType::Auto }
fn default_retry_delay() -> u64 { 1_000 }
