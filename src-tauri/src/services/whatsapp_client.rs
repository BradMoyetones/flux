pub struct WhatsAppCore {
    pub is_connected: bool,
}

impl WhatsAppCore {
    pub fn new() -> Self {
        Self {
            is_connected: false,
        }
    }

    pub async fn connect(&mut self) -> Result<String, String> {
        self.is_connected = true;
        Ok("QR_STRING_12345".to_string())
    }

    pub async fn send_message(&self, _chat_id: &str, _message: &str) -> Result<(), String> {
        if !self.is_connected {
            return Err("WhatsApp no está conectado".to_string());
        }
        // TODO: implementar envío real de mensaje
        Ok(())
    }
}
