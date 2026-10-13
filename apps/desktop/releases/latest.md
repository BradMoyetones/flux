---
title: Flux v2.1.0
version: v2.1.0
date: 13 de agosto de 2026
tag: v2.1.0
---
### Minor Changes

- ed68f8a: ### Mejoras Core y Estabilidad
    - **Tipado Estricto de Errores (AppError):** Se ha reescrito por completo el sistema de manejo de excepciones en el backend (Rust). Ahora todos los módulos (Workspaces, Ejecución de Flujos, Sidecars y Almacenamiento) se comunican mediante un sistema de errores fuertemente tipado. Esto elimina las fallas silenciosas, mejora drásticamente la observabilidad para debugging y asegura una comunicación IPC mucho más predecible con la interfaz de usuario.
    - **Single Source of Truth (Configuración):** Se ha unificado la persistencia de la aplicación. Eliminamos archivos de configuración redundantes (`.app-settings.json`) consolidando absolutamente toda la configuración, índices de flujos y estado del usuario en un único y robusto `user-settings.json`. El backend ahora refleja 1:1 el estado exacto de Zustand.
    - **Factory Reset "Nuclear":** Se ha implementado un nuevo sistema de restablecimiento de fábrica sumamente estricto. Al solicitar un borrado de la aplicación, Flux ahora destruye de manera física las cachés, cierra forzosamente todos los subprocesos de WhatsApp, purga los stores en memoria y elimina archivos residuales del sistema antes de forzar un reinicio limpio. ¡Cero "datos fantasma" garantizado!

    ### Interfaz de Usuario y Experiencia (UX)
    - **Soporte Nativo de Avatares:** Hemos reescrito el motor de carga de imágenes de perfil. Al eliminar la dependencia de procesamiento de imágenes de terceros, Flux ahora guarda copias exactas del archivo original. Esto significa soporte inmediato para **GIFs animados** y formatos especiales del sistema operativo (como **HEIF/HEIC** de Apple), sin pérdida de calidad ni bloqueos de formato.
    - **Mejoras en el Onboarding:** Solucionamos un error de "carrera" (race condition) e hidratación (manejo de datos nulos/indefinidos) durante el arranque inicial que causaba que la aplicación saltara erróneamente la pantalla de bienvenida.
    - **Reducción de Peso del Binario:** Al eliminar dependencias pesadas de procesamiento de imágenes (`image` crate), logramos compilar un binario de escritorio mucho más ligero y de arranque más rápido.
