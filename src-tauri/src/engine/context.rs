use std::collections::HashMap;

use crate::models::execution::StepOutput;

/// Contexto compartido del pipeline — transporta datos entre steps.
/// Cada step completado almacena su output aquí, y los steps siguientes
/// pueden acceder a esos datos via `get_step_output` o `resolve_template`.
pub struct PipelineContext {
    /// Output de cada step completado, indexado por step_id
    steps_output: HashMap<String, StepOutput>,
    /// Variables globales del workflow (ej: configuración del usuario)
    variables: HashMap<String, serde_json::Value>,
}

impl PipelineContext {
    pub fn new() -> Self {
        Self {
            steps_output: HashMap::new(),
            variables: HashMap::new(),
        }
    }

    /// Almacena el output de un step completado
    pub fn set_step_output(&mut self, step_id: &str, output: StepOutput) {
        self.steps_output.insert(step_id.to_string(), output);
    }

    /// Obtiene el output de un step anterior por su ID
    pub fn get_step_output(&self, step_id: &str) -> Option<&StepOutput> {
        self.steps_output.get(step_id)
    }

    /// Establece una variable global del workflow
    pub fn set_variable(&mut self, key: &str, value: serde_json::Value) {
        self.variables.insert(key.to_string(), value);
    }

    /// Resuelve templates en un string, reemplazando referencias tipo `{{step_id.data.field}}`
    /// con los valores reales del contexto.
    ///
    /// Ejemplos de templates soportados:
    /// - `{{step_1.data.price}}` → accede a `steps_output["step_1"].data["price"]`
    /// - `{{step_2.metadata.headers.set-cookie}}` → accede a metadata del step
    /// - `{{vars.api_key}}` → accede a variables globales
    pub fn resolve_template(&self, template: &str) -> String {
        let mut result = template.to_string();

        // Buscar todos los patterns {{...}} y resolverlos
        while let Some(start) = result.find("{{") {
            if let Some(end) = result[start..].find("}}") {
                let end = start + end + 2;
                let reference = &result[start + 2..end - 2].trim();
                let resolved = self.resolve_reference(reference);
                result = format!("{}{}{}", &result[..start], resolved, &result[end..]);
            } else {
                break; // Template mal formado, dejar como está
            }
        }

        result
    }

    /// Resuelve una referencia individual (ej: "step_1.data.price")
    fn resolve_reference(&self, reference: &str) -> String {
        let parts: Vec<&str> = reference.splitn(2, '.').collect();

        if parts.is_empty() {
            return format!("{{{{{}}}}}", reference); // Devolver sin resolver
        }

        // Variables globales: {{vars.key}}
        if parts[0] == "vars" {
            if let Some(rest) = parts.get(1) {
                if let Some(val) = self.variables.get(*rest) {
                    return value_to_string(val);
                }
            }
            return format!("{{{{{}}}}}", reference);
        }

        // Referencias a steps: {{step_id.data.field}} o {{step_id.metadata.field}}
        let step_id = parts[0];
        if let Some(output) = self.steps_output.get(step_id) {
            if let Some(rest) = parts.get(1) {
                let sub_parts: Vec<&str> = rest.splitn(2, '.').collect();

                match sub_parts[0] {
                    "data" => {
                        if let Some(field_path) = sub_parts.get(1) {
                            let val = navigate_json(&output.data, field_path);
                            return value_to_string(&val);
                        }
                        return value_to_string(&output.data);
                    }
                    "metadata" => {
                        if let Some(field_path) = sub_parts.get(1) {
                            // Acceso a headers de metadata
                            if field_path.starts_with("headers.") {
                                let header_key = &field_path[8..];
                                if let Some(headers) = &output.metadata.headers {
                                    if let Some(val) = headers.get(header_key) {
                                        return val.clone();
                                    }
                                }
                            }
                            if *field_path == "status_code" {
                                return output
                                    .metadata
                                    .status_code
                                    .map(|c| c.to_string())
                                    .unwrap_or_default();
                            }
                        }
                        return String::new();
                    }
                    _ => {}
                }
            }
        }

        // No se pudo resolver, devolver el template original
        format!("{{{{{}}}}}", reference)
    }
}

/// Navega un serde_json::Value usando un path separado por puntos
fn navigate_json(data: &serde_json::Value, path: &str) -> serde_json::Value {
    let parts: Vec<&str> = path.split('.').collect();
    let mut current = data;

    for part in parts {
        match current {
            serde_json::Value::Object(map) => {
                if let Some(val) = map.get(part) {
                    current = val;
                } else {
                    return serde_json::Value::Null;
                }
            }
            serde_json::Value::Array(arr) => {
                if let Ok(idx) = part.parse::<usize>() {
                    if let Some(val) = arr.get(idx) {
                        current = val;
                    } else {
                        return serde_json::Value::Null;
                    }
                } else {
                    return serde_json::Value::Null;
                }
            }
            _ => return serde_json::Value::Null,
        }
    }

    current.clone()
}

/// Convierte un serde_json::Value a String de forma legible
fn value_to_string(val: &serde_json::Value) -> String {
    match val {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Null => String::new(),
        other => other.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::execution::OutputMetadata;

    #[test]
    fn test_resolve_simple_template() {
        let mut ctx = PipelineContext::new();
        ctx.set_step_output(
            "step_1",
            StepOutput {
                data: serde_json::json!({"price": "149.99", "name": "Widget"}),
                metadata: OutputMetadata {
                    status_code: Some(200),
                    headers: None,
                    duration_ms: 50,
                    timestamp: "2024-01-01T00:00:00Z".into(),
                },
            },
        );

        let result = ctx.resolve_template("El precio es: {{step_1.data.price}}");
        assert_eq!(result, "El precio es: 149.99");
    }

    #[test]
    fn test_resolve_variable_template() {
        let mut ctx = PipelineContext::new();
        ctx.set_variable("api_key", serde_json::json!("sk-12345"));

        let result = ctx.resolve_template("Key: {{vars.api_key}}");
        assert_eq!(result, "Key: sk-12345");
    }

    #[test]
    fn test_unresolved_template_preserved() {
        let ctx = PipelineContext::new();
        let result = ctx.resolve_template("{{unknown.field}}");
        assert_eq!(result, "{{unknown.field}}");
    }
}
