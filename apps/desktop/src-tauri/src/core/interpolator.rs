use regex::Regex;
use std::sync::OnceLock;
use serde_json::Value;
use crate::core::context::ExecutionContext;

/// Resuelve todas las expresiones `{{ ... }}` dentro de un string usando los
/// resultados de nodos previos y variables globales.
///
/// Si una expresión no se puede resolver devuelve `Err` (el nodo falla con un mensaje
/// claro) en lugar de enviar el literal `{{ERR: ...}}` a la API destino.
pub fn interpolate(template: &str, ctx: &ExecutionContext) -> Result<String, String> {
    static RE: OnceLock<Regex> = OnceLock::new();
    let re = RE.get_or_init(|| Regex::new(r"\{\{\s*(.+?)\s*\}\}").unwrap());

    let mut out = String::with_capacity(template.len());
    let mut last = 0;
    for caps in re.captures_iter(template) {
        let whole = caps.get(0).unwrap();
        out.push_str(&template[last..whole.start()]);
        out.push_str(&resolve_expression(caps.get(1).unwrap().as_str(), ctx)?);
        last = whole.end();
    }
    out.push_str(&template[last..]);
    Ok(out)
}

/// Recorre recursivamente un Value y aplica interpolación a cada String que encuentre.
pub fn interpolate_value(value: &Value, ctx: &ExecutionContext) -> Result<Value, String> {
    match value {
        Value::String(s) => Ok(Value::String(interpolate(s, ctx)?)),
        Value::Object(map) => {
            let mut new_map = serde_json::Map::with_capacity(map.len());
            for (k, v) in map {
                new_map.insert(k.clone(), interpolate_value(v, ctx)?);
            }
            Ok(Value::Object(new_map))
        }
        Value::Array(arr) => arr
            .iter()
            .map(|v| interpolate_value(v, ctx))
            .collect::<Result<Vec<_>, _>>()
            .map(Value::Array),
        other => Ok(other.clone()),
    }
}

fn resolve_expression(expr: &str, ctx: &ExecutionContext) -> Result<String, String> {
    let parts: Vec<&str> = expr.splitn(2, '.').collect();
    let rest = parts.get(1).copied().unwrap_or("");

    match parts[0] {
        "global" => resolve_global(rest),
        // `env.*` fue eliminado a propósito: los .flux son compartibles y exponer las
        // variables de entorno del proceso permitiría exfiltrar datos del equipo.
        "env" => Err("{{env.*}} ya no está disponible. Usa una variable global (custom.*)".to_string()),
        "custom" => ctx
            .get_custom_variable(rest)
            .ok_or_else(|| format!("La variable global '{rest}' no existe")),
        node_id => {
            // Soporta tanto nodeId.data.path.to.value como nodeId.path.to.value
            let suffix = expr.strip_prefix(node_id).unwrap_or("");
            let json_path = if let Some(stripped) = suffix.strip_prefix(".data.") {
                stripped
            } else if let Some(stripped) = suffix.strip_prefix('.') {
                stripped
            } else {
                suffix
            };
            resolve_node_output(node_id, json_path, ctx)
        }
    }
}

fn resolve_node_output(node_id: &str, json_path: &str, ctx: &ExecutionContext) -> Result<String, String> {
    match ctx.get_node_result(node_id) {
        Some(value) => navigate_json(node_id, &value, json_path),
        None => Err(format!(
            "El nodo '{node_id}' no tiene resultado (¿está conectado antes de este nodo y se ejecutó con éxito?)"
        )),
    }
}

fn navigate_json(node_id: &str, value: &Value, path: &str) -> Result<String, String> {
    let mut current = value;
    for key in path.split('.') {
        if key.is_empty() {
            continue;
        }
        // Soporta acceso a arrays por índice numérico: "items.0.name"
        if let Ok(index) = key.parse::<usize>() {
            match current.get(index) {
                Some(v) => current = v,
                None => return Err(format!("{node_id}.{path}: el índice {index} está fuera de rango")),
            }
        } else {
            match current.get(key) {
                Some(v) => current = v,
                None => return Err(format!("{node_id}.{path}: el campo '{key}' no existe en el resultado")),
            }
        }
    }
    Ok(match current {
        Value::String(s) => s.clone(),
        Value::Null => String::new(),
        other => other.to_string(),
    })
}

fn resolve_global(key: &str) -> Result<String, String> {
    let now = chrono::Local::now();

    Ok(match key {
        "time_pm" => now.format("%I:%M %p").to_string(),
        "time_24" => now.format("%H:%M").to_string(),
        "date" => now.format("%Y-%m-%d").to_string(),
        "datetime" => now.format("%Y-%m-%d %H:%M:%S").to_string(),
        "timestamp" => now.timestamp().to_string(),
        "day_name" => now.format("%A").to_string(),
        "month_name" => now.format("%B").to_string(),
        "year" => now.format("%Y").to_string(),
        "timeEmoji" => get_clock_emoji(&now),
        _ => return Err(format!("La variable global '{key}' es desconocida")),
    })
}

/// Devuelve el emoji de reloj correcto para la hora actual,
/// mapeando las 24 posiciones del reloj analógico (12 horas en punto + 12 medias horas).
fn get_clock_emoji(now: &chrono::DateTime<chrono::Local>) -> String {
    let hour_12 = now.format("%I").to_string().parse::<u32>().unwrap_or(12);
    let minute = now.format("%M").to_string().parse::<u32>().unwrap_or(0);

    let emoji = match (hour_12, minute >= 30) {
        (1, false)  => "🕐",
        (1, true)   => "🕜",
        (2, false)  => "🕑",
        (2, true)   => "🕝",
        (3, false)  => "🕒",
        (3, true)   => "🕞",
        (4, false)  => "🕓",
        (4, true)   => "🕟",
        (5, false)  => "🕔",
        (5, true)   => "🕠",
        (6, false)  => "🕕",
        (6, true)   => "🕡",
        (7, false)  => "🕖",
        (7, true)   => "🕢",
        (8, false)  => "🕗",
        (8, true)   => "🕣",
        (9, false)  => "🕘",
        (9, true)   => "🕤",
        (10, false) => "🕙",
        (10, true)  => "🕥",
        (11, false) => "🕚",
        (11, true)  => "🕦",
        (12, false) => "🕛",
        (12, true)  => "🕧",
        _ => "🕛",
    };

    emoji.to_string()
}
