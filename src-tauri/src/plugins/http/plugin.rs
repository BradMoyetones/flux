use std::sync::Arc;
use std::time::Duration;
use std::collections::HashMap;
use async_trait::async_trait;
use serde_json::{json, Value};
use crate::core::context::ExecutionContext;
use crate::plugins::registry::NodePlugin;
use super::config::{HttpNodeConfig, HttpMethod, HttpAuth, ApiKeyLocation, ResponseType};

pub struct HttpPlugin;

#[async_trait]
impl NodePlugin for HttpPlugin {
    fn identifier(&self) -> &'static str {
        "http"
    }

    async fn execute(&self, _ctx: &mut ExecutionContext, config: &Value) -> Result<Value, String> {
        let cfg: HttpNodeConfig = serde_json::from_value(config.clone())
            .map_err(|e| format!("Config inválida para HttpPlugin: {e}"))?;

        // ── Build client ──
        let mut client_builder = reqwest::Client::builder()
            .timeout(Duration::from_millis(cfg.timeout_ms))
            .danger_accept_invalid_certs(cfg.ignore_ssl_errors)
            .cookie_store(cfg.persist_cookies);

        // Redirects
        if !cfg.follow_redirects || cfg.max_redirects == 0 {
            client_builder = client_builder.redirect(reqwest::redirect::Policy::none());
        } else {
            client_builder = client_builder.redirect(
                reqwest::redirect::Policy::limited(cfg.max_redirects as usize)
            );
        }

        // Proxy
        if let Some(proxy_cfg) = &cfg.proxy {
            let mut proxy = reqwest::Proxy::all(&proxy_cfg.url)
                .map_err(|e| format!("Proxy inválido: {e}"))?;
            if let (Some(user), Some(pass)) = (&proxy_cfg.username, &proxy_cfg.password) {
                proxy = proxy.basic_auth(user, pass);
            }
            client_builder = client_builder.proxy(proxy);
        }

        let client = client_builder.build().map_err(|e| format!("Error creando el cliente HTTP: {e}"))?;

        // ── Build request ──
        let method = match cfg.method {
            HttpMethod::Get     => reqwest::Method::GET,
            HttpMethod::Post    => reqwest::Method::POST,
            HttpMethod::Put     => reqwest::Method::PUT,
            HttpMethod::Patch   => reqwest::Method::PATCH,
            HttpMethod::Delete  => reqwest::Method::DELETE,
            HttpMethod::Head    => reqwest::Method::HEAD,
            HttpMethod::Options => reqwest::Method::OPTIONS,
        };

        let mut request = client.request(method, &cfg.url);

        // Query params
        if !cfg.query_params.is_empty() {
            request = request.query(&cfg.query_params.iter().collect::<Vec<_>>());
        }

        // Headers
        for (key, value) in &cfg.headers {
            request = request.header(key.as_str(), value.as_str());
        }

        // Content-Type
        if let Some(ct) = &cfg.content_type {
            request = request.header("Content-Type", ct.as_str());
        }

        // Authentication
        if let Some(auth) = &cfg.auth {
            match auth {
                HttpAuth::Basic { username, password } => {
                    request = request.basic_auth(username, Some(password));
                }
                HttpAuth::Bearer { token } => {
                    request = request.bearer_auth(token);
                }
                HttpAuth::ApiKey { key, value, location } => {
                    match location {
                        ApiKeyLocation::Header => {
                            request = request.header(key.as_str(), value.as_str());
                        }
                        ApiKeyLocation::QueryParam => {
                            request = request.query(&[(key, value)]);
                        }
                    }
                }
            }
        }

        // Body
        if let Some(body) = &cfg.body {
            request = request.body(body.clone());
        }

        // ── Execute with retry ──
        let mut last_error = String::new();
        let max_attempts = cfg.retry_count.saturating_add(1);

        for attempt in 0..max_attempts {
            if attempt > 0 {
                tokio::time::sleep(Duration::from_millis(cfg.retry_delay_ms)).await;
            }

            match request.try_clone() {
                Some(req) => {
                    match req.send().await {
                        Ok(response) => {
                            let status = response.status().as_u16();
                            let response_headers: HashMap<String, String> = response
                                .headers()
                                .iter()
                                .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
                                .collect();

                            // Parse body based on response_type
                            let body_value = match cfg.response_type {
                                ResponseType::Json => {
                                    response.json::<Value>().await.unwrap_or(Value::Null)
                                }
                                ResponseType::Text => {
                                    Value::String(response.text().await.unwrap_or_default())
                                }
                                ResponseType::Binary => {
                                    let bytes = response.bytes().await.unwrap_or_default();
                                    Value::String(base64_encode(&bytes))
                                }
                                ResponseType::Auto => {
                                    let content_type = response_headers
                                        .get("content-type")
                                        .cloned()
                                        .unwrap_or_default();
                                    let text = response.text().await.unwrap_or_default();

                                    if content_type.contains("json") {
                                        serde_json::from_str::<Value>(&text).unwrap_or(Value::String(text))
                                    } else {
                                        Value::String(text)
                                    }
                                }
                            };

                            // Si el status es >= 500 y hay reintentos, retry
                            if status >= 500 && attempt < cfg.retry_count {
                                last_error = format!("HTTP {status}");
                                continue;
                            }

                            return Ok(json!({
                                "statusCode": status,
                                "headers": response_headers,
                                "body": body_value,
                            }));
                        }
                        Err(e) => {
                            last_error = e.to_string();
                            if attempt >= cfg.retry_count {
                                return Err(format!("HTTP request falló después de {} intentos: {}", max_attempts, last_error));
                            }
                        }
                    }
                }
                None => {
                    return Err("No se pudo clonar la request para reintentar (¿el body es un stream?)".into());
                }
            }
        }

        Err(format!("HTTP request agotó todos los reintentos: {last_error}"))
    }
}

fn base64_encode(data: &[u8]) -> String {
    // Encoding base64 manual sin dependencia extra
    use std::fmt::Write;
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity(data.len() * 4 / 3 + 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = chunk.get(1).copied().unwrap_or(0) as u32;
        let b2 = chunk.get(2).copied().unwrap_or(0) as u32;
        let triple = (b0 << 16) | (b1 << 8) | b2;
        result.push(CHARS[((triple >> 18) & 0x3F) as usize] as char);
        result.push(CHARS[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 { result.push(CHARS[((triple >> 6) & 0x3F) as usize] as char); } else { result.push('='); }
        if chunk.len() > 2 { result.push(CHARS[(triple & 0x3F) as usize] as char); } else { result.push('='); }
    }
    result
}
