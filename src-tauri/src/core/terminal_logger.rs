use tracing::Subscriber;
use tracing_subscriber::{layer::Context, Layer};
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;
use tokio::time::{interval, Duration};

pub struct TerminalLayer {
    sender: mpsc::Sender<String>,
}

impl<S: Subscriber> Layer<S> for TerminalLayer {
    fn on_event(&self, event: &tracing::Event<'_>, _ctx: Context<'_, S>) {
        let mut visitor = StringVisitor::new();
        event.record(&mut visitor);
        
        let level = event.metadata().level();
        let target = event.metadata().target();
        
        let color = match *level {
            tracing::Level::ERROR => "\x1b[31m", // Red
            tracing::Level::WARN => "\x1b[33m",  // Yellow
            tracing::Level::INFO => "\x1b[32m",  // Green
            tracing::Level::DEBUG => "\x1b[36m", // Cyan
            tracing::Level::TRACE => "\x1b[90m", // Gray
        };
        let reset = "\x1b[0m";
        
        // Limpiamos comillas extra si message viene como debug string
        let msg_clean = if visitor.message.starts_with('"') && visitor.message.ends_with('"') {
            visitor.message[1..visitor.message.len()-1].to_string()
        } else {
            visitor.message
        };

        let msg = format!("{}[{}] [{}] {}{}\r\n", color, level, target, msg_clean, reset);
        
        let _ = self.sender.try_send(msg);
    }
}

struct StringVisitor {
    message: String,
}

impl StringVisitor {
    fn new() -> Self {
        Self { message: String::new() }
    }
}

impl tracing::field::Visit for StringVisitor {
    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        if field.name() == "message" {
            self.message = format!("{:?}", value);
        }
    }
}

pub fn init_terminal_logger(app: AppHandle) -> TerminalLayer {
    let (tx, mut rx) = mpsc::channel::<String>(10000);
    
    tauri::async_runtime::spawn(async move {
        let mut buffer = String::new();
        let mut interval = interval(Duration::from_millis(50));
        
        loop {
            tokio::select! {
                Some(msg) = rx.recv() => {
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
