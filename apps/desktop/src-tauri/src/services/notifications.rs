use tauri::{AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;
use chrono::Local;

#[derive(Debug, Clone, Copy)]
pub enum NotificationType {
    FlowSuccess,
    FlowError,
    SessionDisconnect,
}

/// Motor interno: Filtra y decide si una notificación realmente debe llegar al Sistema Operativo
fn evaluate_and_send(
    app: &AppHandle,
    notif_type: NotificationType,
    title: &str,
    body: &str,
) -> Result<(), String> {
    let config = crate::storage::config::get_notification_config(app);

    if config.only_when_unfocused {
        if let Some(window) = app.get_webview_window("main") {
            if window.is_focused().unwrap_or(false) {
                return Ok(());
            }
        }
    }

    if !config.desktop_enabled {
        return Ok(());
    }

    let should_fire = match notif_type {
        NotificationType::FlowSuccess => config.on_flow_success,
        NotificationType::FlowError => config.on_flow_error,
        NotificationType::SessionDisconnect => config.on_session_disconnect,
    };

    if !should_fire {
        return Ok(());
    }

    if config.quiet_hours {
        let current_hour = Local::now().format("%H").to_string().parse::<u32>().unwrap_or(12);
        // Si está entre las 22:00 y las 07:00, bloqueamos la alerta
        if current_hour >= 22 || current_hour < 7 {
            return Ok(());
        }
    }

    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn notify_flow_success(app: &AppHandle, flow_name: &str) -> Result<(), String> {
    evaluate_and_send(
        app,
        NotificationType::FlowSuccess,
        "Flujo Completado",
        &format!("El flujo '{}' ha finalizado con éxito.", flow_name),
    )
}

pub fn notify_flow_error(app: &AppHandle, flow_name: &str, error_message: &str) -> Result<(), String> {
    evaluate_and_send(
        app,
        NotificationType::FlowError,
        "Error en Flujo",
        &format!("Fallo en '{}': {}", flow_name, error_message),
    )
}

pub fn notify_session_disconnect(app: &AppHandle, session_id: Option<&str>) -> Result<(), String> {
    let msg = match session_id {
        Some(id) => format!("Tu sesión de WhatsApp ({}) se ha desconectado.", id),
        None => "Tu sesión de WhatsApp se ha desconectado.".to_string(),
    };

    evaluate_and_send(
        app,
        NotificationType::SessionDisconnect,
        "Sesión Desconectada",
        &msg,
    )
}

pub fn notify_test(app: &AppHandle) -> Result<(), String> {
    let config = crate::storage::config::get_notification_config(app);

    if !config.desktop_enabled {
        return Ok(());
    }

    app.notification()
        .builder()
        .title("Flux - Prueba")
        .body("¡Las notificaciones están funcionando correctamente! 🚀")
        .show()
        .map_err(|e| e.to_string())
}
