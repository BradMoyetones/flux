use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;
use chrono::Local;

pub fn send_notification(app: &AppHandle, title: &str, body: &str) -> Result<(), String> {
    let notifications = crate::storage::config::get_notification_config(app);

    if !notifications.desktop_enabled {
        return Ok(());
    }

    if notifications.quiet_hours {
        let current_hour = Local::now().format("%H").to_string().parse::<u32>().unwrap_or(12);
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

