use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WhatsAppSessionInfo {
    pub id: String,
    pub port: u16,
    pub connected: bool,
    pub jid: Option<String>,
}

pub struct WhatsAppSession {
    pub info: WhatsAppSessionInfo,
    pub child: tauri_plugin_shell::process::CommandChild,
}

pub struct WhatsAppManager {
    sessions: Mutex<HashMap<String, WhatsAppSession>>,
}

impl WhatsAppManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub async fn start_session(&self, app: &AppHandle, session_id: &str) -> Result<WhatsAppSessionInfo, String> {
        let mut sessions = self.sessions.lock().await;
        if let Some(session) = sessions.get(session_id) {
            return Ok(session.info.clone());
        }

        let port = {
            let listener = std::net::TcpListener::bind("127.0.0.1:0")
                .map_err(|e| format!("Failed to bind to free port: {}", e))?;
            listener.local_addr()
                .map_err(|e| format!("Failed to get local address: {}", e))?.port()
        };

        let app_data_dir = app.path().app_data_dir()
            .map_err(|e| format!("Failed to get app_data_dir: {}", e))?;
        
        let mut db_path = app_data_dir.clone();
        db_path.push("whatsapp");
        std::fs::create_dir_all(&db_path)
            .map_err(|e| format!("Failed to create db path: {}", e))?;
        db_path.push(format!("{}.db", session_id));

        let (mut rx, child) = app.shell()
            .sidecar("whatsapp-sidecar")
            .map_err(|e| format!("Failed to create sidecar: {}", e))?
            .args(["--port", &port.to_string(), "--db-path", db_path.to_string_lossy().as_ref()])
            .spawn()
            .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

        tokio::spawn(async move {
            while let Some(event) = rx.recv().await {
                match event {
                    CommandEvent::Stdout(line) => {
                        eprintln!("whatsapp-sidecar stdout: {}", String::from_utf8_lossy(&line));
                    }
                    CommandEvent::Stderr(line) => {
                        eprintln!("whatsapp-sidecar stderr: {}", String::from_utf8_lossy(&line));
                    }
                    _ => {}
                }
            }
        });

        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

        let info = WhatsAppSessionInfo {
            id: session_id.to_string(),
            port,
            connected: false,
            jid: None,
        };

        sessions.insert(session_id.to_string(), WhatsAppSession {
            info: info.clone(),
            child,
        });

        Ok(info)
    }

    pub async fn get_session_port(&self, session_id: &str) -> Result<u16, String> {
        let sessions = self.sessions.lock().await;
        sessions.get(session_id)
            .map(|s| s.info.port)
            .ok_or_else(|| format!("Session {} not found", session_id))
    }

    pub async fn stop_session(&self, session_id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().await;
        if let Some(session) = sessions.remove(session_id) {
            session.child.kill().map_err(|e| format!("Failed to kill sidecar: {}", e))?;
        }
        Ok(())
    }

    pub async fn list_sessions(&self, app: &AppHandle) -> Vec<WhatsAppSessionInfo> {
        let mut results = HashMap::new();
        
        // 1. Escanear base de datos locales
        if let Ok(app_data_dir) = app.path().app_data_dir() {
            let mut db_path = app_data_dir.clone();
            db_path.push("whatsapp");
            
            if let Ok(entries) = std::fs::read_dir(&db_path) {
                for entry in entries.filter_map(Result::ok) {
                    let path = entry.path();
                    if path.is_file() && path.extension().unwrap_or_default() == "db" {
                        if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                            results.insert(stem.to_string(), WhatsAppSessionInfo {
                                id: stem.to_string(),
                                port: 0, // No corriendo aún
                                connected: false,
                                jid: None,
                            });
                        }
                    }
                }
            }
        }

        // 2. Sobrescribir con las sesiones corriendo en memoria
        let sessions = self.sessions.lock().await;
        for (id, session) in sessions.iter() {
            results.insert(id.clone(), session.info.clone());
        }

        results.into_values().collect()
    }

    pub async fn send_request(&self, session_id: &str, method: &str, path: &str, body: Option<&Value>) -> Result<Value, String> {
        let port = self.get_session_port(session_id).await?;
        let url = format!("http://127.0.0.1:{}{}", port, path);
        
        let client = reqwest::Client::new();
        let mut req = match method.to_uppercase().as_str() {
            "GET" => client.get(&url),
            "POST" => client.post(&url),
            "PUT" => client.put(&url),
            "DELETE" => client.delete(&url),
            _ => return Err(format!("Unsupported method: {}", method)),
        };

        if let Some(b) = body {
            req = req.json(b);
        }

        let res = req.send().await
            .map_err(|e| format!("Request failed: {}", e))?;
            
        let json = res.json::<Value>().await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        Ok(json)
    }
}
