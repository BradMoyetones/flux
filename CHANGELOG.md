# flux

## 2.0.0

### Major Changes

- c59ee05: # Flux v2.0.0 - The Automation Engine Update

    La versión 1.0.0 nos dio las bases visuales, pero la **versión 2.0.0** es donde la verdadera magia ocurre. Flux ya no es solo un lienzo de nodos; ahora es un **Motor de Automatización Local-First** capaz de orquestar flujos de trabajo complejos, mantener estados y ejecutar tareas en segundo plano.

    Hemos reescrito el núcleo del motor en Rust, integrado un sidecar en Go para WhatsApp y rediseñado la interfaz para que se sienta como un verdadero IDE.

    ### Major Features (Nuevas Funcionalidades Core)
    - **Motor de Ejecución DAG (Grafos Acíclicos Dirigidos):** El motor ahora respeta la topología matemática de tus conexiones. Los nodos esperan de forma inteligente a que sus "padres" terminen con éxito antes de ejecutarse, permitiendo bifurcaciones y flujos complejos.
    - **Scheduling Avanzado (Cron Engine):** Los flujos ahora tienen vida propia. Puedes programar automatizaciones mediante expresiones Cron, definiendo fecha/hora de inicio (`starts_at`), fecha de expiración (`expires_at`) y límite máximo de ejecuciones.
    - **Motor de Interpolación (Templating):** ¡Los datos ahora fluyen! Puedes pasar información de un nodo a otro usando plantillas como `{{node1.data.body}}` o acceder a variables globales del sistema como `{{global.timeEmoji}}`.
    - **Terminal de Depuración Integrada (DevTools):** Hemos incorporado una terminal en tiempo real (basada en `xterm.js`) que muestra los logs crudos del motor de Rust y del Sidecar con colores ANSI nativos, dándote visibilidad absoluta de qué está ocurriendo bajo el capó (estilo VS Code).

    ### Plugins Oficiales (Nodos)
    - **Nuevo Plugin HTTP:** Un cliente HTTP súper vitaminado. Soporta configuración completa (Headers, Query Params, Body Builder) y cuenta con un **Cookie Jar Global**. Si activas `persistCookies`, las sesiones de autenticación viajarán automáticamente de un nodo HTTP al siguiente sin que tengas que mapearlas manualmente.
    - **Nuevo Plugin WhatsApp (vía Go Sidecar):** Hemos integrado un Sidecar escrito en Go para manejar conexiones de WhatsApp ultrarrápidas y seguras. Genera el código QR nativo en la interfaz, guarda la sesión y te permite enviar mensajes automatizados con todo el contexto de tu flujo.

    ### Interfaz y Experiencia de Usuario (UI/UX)
    - **Layout de IDE Profesional:** Decimos adiós a los modales flotantes. Ahora el Canvas cuenta con paneles redimensionables (Resizable Panels) para la Configuración de Nodos, Ajustes Globales del Flujo y el Inspector de Ejecución.
    - **Analíticas y Metadatos en Tiempo Real:** El backend ahora registra históricamente la "Última Ejecución" y el "Conteo total" para cada flujo, guardándolo en el archivo y actualizando la interfaz instantáneamente vía eventos IPC.
    - **Sincronización de Estado (Hidratación):** La interfaz ahora sabe exactamente si un flujo Cron está corriendo o esperando en segundo plano, sobreviviendo incluso a las recargas (F5) de la ventana gracias al nuevo sistema de hidratación de Zustand.
    - **Migración a Shadcn UI:** Hemos limpiado componentes obsoletos, adoptando componentes nativos y minimalistas de Shadcn para una experiencia visual cohesiva.

    ### Under the Hood (Arquitectura y Rendimiento)
    - **Nuevo formato de archivo `.flux`:** Los flujos ahora se guardan bajo su propia extensión, garantizando un escaneo exclusivo y limpio en tus workspaces.
    - **Ultra-rendimiento en I/O:** Cambiamos la lógica de escaneo de archivos a la librería `ignore` en Rust, haciendo que la lectura de workspaces masivos sea prácticamente instantánea.
    - **Manejo de Errores Unificado (`AppError`):** El sistema nunca hace _panic_. Todo error (HTTP, Storage, WhatsApp o Scheduler) es capturado, categorizado y emitido al frontend de forma elegante.
    - **Contract Injection (Backwards Compatibility):** Los archivos antiguos son parcheados automáticamente en memoria por Rust con los nuevos campos requeridos (como `metadata`), asegurando que nunca pierdas tus flujos creados en versiones anteriores.
