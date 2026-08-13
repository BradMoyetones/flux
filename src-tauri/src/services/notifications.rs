use tauri::AppHandle;
use tauri_plugin_store::StoreExt;
use tauri_plugin_notification::NotificationExt;
use chrono::Local;

pub fn send_notification(app: &AppHandle, title: &str, body: &str) -> Result<(), String> {
    let store = app.store("user-settings.json").map_err(|e| e.to_string())?;
    
    if let Some(notifications_val) = store.get("notifications") {
        if let Some(notifications_obj) = notifications_val.as_object() {
            if let Some(enabled) = notifications_obj.get("desktopEnabled").and_then(|v| v.as_bool()) {
                if !enabled {
                    return Ok(());
                }
            }
            
            if let Some(quiet_hours) = notifications_obj.get("quietHours").and_then(|v| v.as_bool()) {
                if quiet_hours {
                    let current_hour = Local::now().format("%H").to_string().parse::<u32>().unwrap_or(12);
                    if current_hour >= 22 || current_hour < 7 {
                        return Ok(());
                    }
                }
            }
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
