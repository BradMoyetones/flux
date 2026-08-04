use regex::Regex;
use serde_json::Value;
use crate::core::context::ExecutionContext;

/// Resuelve todas las expresiones `{{ ... }}` dentro de un string
/// usando los resultados de nodos previos y variables globales.
pub fn interpolate(template: &str, ctx: &ExecutionContext) -> String {
    let re = Regex::new(r"\{\{\s*(.+?)\s*\}\}").unwrap();

    re.replace_all(template, |caps: &regex::Captures| {
        let expr = caps.get(1).unwrap().as_str();
        resolve_expression(expr, ctx)
    })
    .to_string()
}

/// Recorre recursivamente un Value y aplica interpolación a cada String que encuentre.
pub fn interpolate_value(value: &Value, ctx: &ExecutionContext) -> Value {
    match value {
        Value::String(s) => Value::String(interpolate(s, ctx)),
        Value::Object(map) => {
            let new_map = map
                .iter()
                .map(|(k, v)| (k.clone(), interpolate_value(v, ctx)))
                .collect();
            Value::Object(new_map)
        }
        Value::Array(arr) => Value::Array(arr.iter().map(|v| interpolate_value(v, ctx)).collect()),
        other => other.clone(),
    }
}

fn resolve_expression(expr: &str, ctx: &ExecutionContext) -> String {
    let parts: Vec<&str> = expr.splitn(2, '.').collect();

    match parts[0] {
        "global" => resolve_global(parts.get(1).copied().unwrap_or("")),
        "env" => std::env::var(parts.get(1).copied().unwrap_or(""))
            .unwrap_or_default(),
        node_id => {
            // nodeId.data.path.to.value
            let json_path = expr
                .strip_prefix(node_id)
                .and_then(|s| s.strip_prefix(".data."))
                .unwrap_or("");
            resolve_node_output(node_id, json_path, ctx)
        }
    }
}

fn resolve_node_output(node_id: &str, json_path: &str, ctx: &ExecutionContext) -> String {
    match ctx.get_node_result(node_id) {
        Some(value) => navigate_json(value, json_path),
        None => format!("{{{{ERR: node '{}' sin resultado}}}}", node_id),
    }
}

fn navigate_json(value: &Value, path: &str) -> String {
    let mut current = value;
    for key in path.split('.') {
        if key.is_empty() {
            continue;
        }
        // Soporta acceso a arrays por índice numérico: "items.0.name"
        if let Ok(index) = key.parse::<usize>() {
            match current.get(index) {
                Some(v) => current = v,
                None => return format!("{{{{ERR: índice '{}' fuera de rango}}}}", index),
            }
        } else {
            match current.get(key) {
                Some(v) => current = v,
                None => return format!("{{{{ERR: campo '{}' no encontrado}}}}", key),
            }
        }
    }
    match current {
        Value::String(s) => s.clone(),
        Value::Null => String::new(),
        other => other.to_string(),
    }
}

fn resolve_global(key: &str) -> String {
    let now = chrono::Local::now();

    match key {
        "time_pm" => now.format("%I:%M %p").to_string(),
        "time_24" => now.format("%H:%M").to_string(),
        "date" => now.format("%Y-%m-%d").to_string(),
        "datetime" => now.format("%Y-%m-%d %H:%M:%S").to_string(),
        "timestamp" => now.timestamp().to_string(),
        "day_name" => now.format("%A").to_string(),
        "month_name" => now.format("%B").to_string(),
        "year" => now.format("%Y").to_string(),
        "timeEmoji" => get_clock_emoji(&now),
        _ => format!("{{{{ERR: global '{}' desconocido}}}}", key),
    }
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
