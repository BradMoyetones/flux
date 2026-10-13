---
title: Flux v2.2.1
version: v2.2.1
date: 13 de octubre de 2026
tag: v2.2.1
---
### Motor y Persistencia (Core)

- **Historial de Ejecuciones Persistente con SQLite:** Se integró un motor de base de datos relacional SQLite embebido en Rust. A partir de ahora, cada ejecución de flujo, estado de nodo, métricas de duración y salidas se almacenan de manera local y ultrarrápida, permitiendo auditoría y trazabilidad histórica completa sin degradar el rendimiento del canvas.

- **Soporte de Zonas Horarias (Timezones):** El motor de scheduling y cron ahora reconoce y respeta zonas horarias específicas (`chrono-tz`). Tus flujos programados se dispararán con precisión matemática según la zona horaria configurada, independientemente de la ubicación física de tu máquina.

- **Inicio Automático con el Sistema (Autostart):** Se implementó integración nativa con el sistema operativo para permitir que Flux arranque en segundo plano al iniciar sesión, manteniendo tus automatizaciones activas sin intervención manual.

### Arquitectura e Interfaz de Usuario (UI/UX)

- **Multitarea Real y Estado Aislado por Pestaña (Tab-Scoped State):** Se rediseñó la arquitectura de estado del frontend. Se reemplazó el store singleton por instancias completamente aisladas por cada pestaña. Ahora puedes trabajar en varios flujos simultáneamente en diferentes tabs sin que las variables, conexiones o estados del inspector colisionen entre sí.

- **Enrutamiento y Vistas de Pestañas Mejorados:** Optimización en la barra de pestañas y en el ciclo de vida del workspace, garantizando que el cierre, cambio o duplicación de pestañas mantenga la memoria limpia y libre de fugas de eventos.

### Infraestructura y Calidad

- **Automatización de Pruebas (CI):** Se incorporó una suite integral de pruebas unitarias en el frontend con Vitest y pruebas de integración en el backend con Cargo dentro de GitHub Actions.

- **Nuevo Flujo de Publicación Tag-Driven:** Se modernizó el sistema de versionado mediante un asistente interactivo en terminal y publicación directa por Git tags, asegurando compilaciones multiplataforma automáticas para macOS (Apple Silicon e Intel), Windows y Linux.

### Corrección de errores

- Corrección de las versiones en los paquetes de tauri.