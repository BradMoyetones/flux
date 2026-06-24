use std::collections::HashMap;

use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde_json::Value;

use crate::errors::AppError;
use crate::models::execution::{OutputMetadata, StepOutput};

/// Cliente HTTP reutilizable con soporte para cookies y headers personalizados
pub struct HttpClient {
    client: reqwest::Client,
}

impl HttpClient {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .cookie_store(true)
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to build HTTP client");

        Self { client }
    }

    /// Ejecuta una petición HTTP y devuelve un StepOutput con la respuesta
    pub async fn execute_request(
        &self,
        method: &str,
        url: &str,
        headers: Option<HashMap<String, String>>,
        body: Option<Value>,
    ) -> Result<StepOutput, AppError> {
        let method = method
            .parse::<reqwest::Method>()
            .map_err(|e| AppError::HttpClient(format!("Método HTTP inválido: {}", e)))?;

        let mut request = self.client.request(method, url);

        // Agregar headers personalizados
        if let Some(hdrs) = headers {
            let mut header_map = HeaderMap::new();
            for (key, value) in hdrs {
                let name = HeaderName::from_bytes(key.as_bytes())
                    .map_err(|e| AppError::HttpClient(format!("Header name inválido: {}", e)))?;
                let val = HeaderValue::from_str(&value)
                    .map_err(|e| AppError::HttpClient(format!("Header value inválido: {}", e)))?;
                header_map.insert(name, val);
            }
            request = request.headers(header_map);
        }

        // Agregar body si existe
        if let Some(body_data) = body {
            request = request.json(&body_data);
        }

        let start = std::time::Instant::now();
        let response = request
            .send()
            .await
            .map_err(|e| AppError::HttpClient(format!("Error en petición: {}", e)))?;

        let duration_ms = start.elapsed().as_millis() as u64;
        let status_code = response.status().as_u16();

        // Capturar headers de respuesta
        let response_headers: HashMap<String, String> = response
            .headers()
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
            .collect();

        // Parsear body como JSON, o como string si falla
        let body_text = response
            .text()
            .await
            .map_err(|e| AppError::HttpClient(format!("Error leyendo respuesta: {}", e)))?;

        let data = serde_json::from_str::<Value>(&body_text)
            .unwrap_or_else(|_| Value::String(body_text));

        Ok(StepOutput {
            data,
            metadata: OutputMetadata {
                status_code: Some(status_code),
                headers: Some(response_headers),
                duration_ms,
                timestamp: chrono::Utc::now().to_rfc3339(),
            },
        })
    }
}
