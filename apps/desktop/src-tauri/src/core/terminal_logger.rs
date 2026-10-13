use tracing::Subscriber;
use tracing_subscriber::{layer::Context, Layer};
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;
use tokio::time::{interval, Duration};
use std::sync::{Arc, Mutex, OnceLock};

static LOG_HISTORY: OnceLock<Arc<Mutex<String>>> = OnceLock::new();

pub fn get_log_history() -> String {
    if let Some(history) = LOG_HISTORY.get() {
        let lock = history.lock().unwrap();
        lock.clone()
    } else {
        String::new()
    }
}

pub struct TerminalLayer {
    sender: mpsc::Sender<String>,
}

impl<S: Subscriber> Layer<S> for TerminalLayer {
    fn on_event(&self, event: &tracing::Event<'_>, _ctx: Context<'_, S>) {
        let mut visitor = StringVisitor::new();
        event.record(&mut visitor);
        
        let level = event.metadata().level();
        let mut target = event.metadata().target();
        if let Some(t) = &visitor.log_target {
            target = t;
        }
        
        let timestamp = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.6fZ").to_string();
        
        let color = match *level {
            tracing::Level::ERROR => "\x1b[31m", // Red
            tracing::Level::WARN => "\x1b[33m",  // Yellow
            tracing::Level::INFO => "\x1b[32m",  // Green
            tracing::Level::DEBUG => "\x1b[36m", // Cyan
            tracing::Level::TRACE => "\x1b[35m", // Magenta
        };
        let dim = "\x1b[2m";
        let reset = "\x1b[0m";
        
        // Limpiamos comillas extra si message viene como debug string
        let msg_clean = if visitor.message.starts_with('"') && visitor.message.ends_with('"') {
            visitor.message[1..visitor.message.len()-1].to_string()
        } else {
            visitor.message
        };

        let msg = format!(
            "{dim}{timestamp}{reset} {color}{level}{reset} {dim}{target}:{reset} {msg_clean}\r\n",
            dim = dim,
            timestamp = timestamp,
            reset = reset,
            color = color,
            level = level,
            target = target,
            msg_clean = msg_clean
        );
        
        let _ = self.sender.try_send(msg);
    }
}

struct StringVisitor {
    message: String,
    log_target: Option<String>,
}

impl StringVisitor {
    fn new() -> Self {
        Self { message: String::new(), log_target: None }
    }
}

impl tracing::field::Visit for StringVisitor {
    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        if field.name() == "message" {
            self.message = format!("{:?}", value);
        } else if field.name() == "log.target" {
            self.log_target = Some(format!("{:?}", value).trim_matches('"').to_string());
        }
    }
}

pub fn init_terminal_logger(app: AppHandle) -> TerminalLayer {
    let (tx, mut rx) = mpsc::channel::<String>(10000);
    
    tauri::async_runtime::spawn(async move {
        let history_arc = Arc::new(Mutex::new(String::with_capacity(100 * 1024)));
        let _ = LOG_HISTORY.set(history_arc.clone());

        let mut buffer = String::new();
        let mut interval = interval(Duration::from_millis(50));
        
        loop {
            tokio::select! {
                Some(msg) = rx.recv() => {
                    if let Ok(mut h) = history_arc.lock() {
                        h.push_str(&msg);
                        if h.len() > 100 * 1024 {
                            let drain_amt = h.len() - (50 * 1024);
                            h.drain(..drain_amt);
                        }
                    }

                    buffer.push_str(&msg);
                    if buffer.len() > 1024 * 1024 { // 1MB limite por chunk de buffer
                        let _ = app.emit("terminal://stdout", buffer.clone());
                        buffer.clear();
                    }
                }
                _ = interval.tick() => {
                    if !buffer.is_empty() {
                        let _ = app.emit("terminal://stdout", buffer.clone());
                        buffer.clear();
                    }
                }
            }
        }
    });

    TerminalLayer { sender: tx }
}
