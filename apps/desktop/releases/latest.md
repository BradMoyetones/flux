---
title: Flux v2.2.2
version: v2.2.2
date: 14 de octubre de 2026
tag: v2.2.2
---
### Motor y Persistencia (Core)

- **Historial de Ejecuciones Persistente con SQLite:** Se integró un motor de base de datos relacional SQLite embebido en Rust. A partir de ahora, cada ejecución de flujo, estado de nodo, métricas de duración y salidas se almacenan de manera local y ultrarrápida, permitiendo auditoría y trazabilidad histórica completa sin degradar el rendimiento del canvas.

- **Soporte de Zonas Horarias (Timezones):** El motor de scheduling y cron ahora reconoce y respeta zonas horarias específicas (`chrono-tz`). Tus flujos programados se dispararán con precisión matemática según la zona horaria configurada, independientemente de la ubicación física de tu máquina.

- **Inicio Automático con el Sistema (Autostart):** Se implementó integración nativa con el sistema operativo para permitir que Flux arranque en segundo plano al iniciar sesión, manteniendo tus automatizaciones activas sin intervención manual.

### Arquitectura e Interfaz de Usuario (UI/UX)

- **Multitarea Real y Estado Aislado por Pestaña (Tab-Scoped State):** Se rediseñó la arquitectura de estado del frontend. Se reemplazó el store singleton por instancias completamente aisladas por cada pestaña. Ahora puedes trabajar en varios flujos simultáneamente en diferentes tabs sin que las variables, conexiones o estados del inspector colisionen entre sí.

- **Arquitectura Modular de Componentes UI (`@flux/ui`):** Reestructuración integral del paquete de componentes mediante *subpath exports* modulares (`@flux/ui/<component>`) y centralización de nodos de React Flow. Esto optimiza el empaquetado (*tree-shaking*), acelera los tiempos de compilación de Vite y garantiza resolución estricta de tipos en TypeScript.

- **Enrutamiento y Vistas de Pestañas Mejorados:** Optimización en la barra de pestañas y en el ciclo de vida del workspace, garantizando que el cierre, cambio o duplicación de pestañas mantenga la memoria limpia y libre de fugas de eventos.

### Infraestructura y Calidad

- **Automatización de Pruebas (CI):** Se incorporó una suite integral de pruebas unitarias en el frontend con Vitest y pruebas de integración en el backend con Cargo dentro de GitHub Actions.

- **Nuevo Flujo de Publicación Tag-Driven:** Se modernizó el sistema de versionado mediante un asistente interactivo en terminal y publicación directa por Git tags, asegurando compilaciones multiplataforma automáticas para macOS (Apple Silicon e Intel), Windows y Linux.

### Corrección de Errores y Compatibilidad

- **Paridad Estricta en Plugins de Tauri v2:** Se sincronizaron las versiones y dependencias de crates en Rust y paquetes NPM (`updater`, `fs`, `process`, etc.) para cumplir con las nuevas políticas de validación en tiempo de compilación de Tauri.

- **Resolución de Tipados en Monorepo:** Corrección de referencias cruzadas en `tsconfig.json` y dependencias circulares entre paquetes del workspace.