---
title: Flux v1.0.0
version: v1.0.0
date: 30 de junio de 2026
tag: v1.0.0
---
Esta es una version de preparacion arquitectonica. Actualmente Flux no contiene nodos, lienzo interactivo, ni logica de negocio real para los flujos. Hemos completado al 100% la fase de *scaffolding* (maquetacion de bases) para garantizar un desarrollo continuo y sin friccion en los siguientes ciclos.

Esta base solida asegura un enrutamiento modular y una arquitectura limpia antes de introducir la logica compleja del motor de orquestacion.

## Novedades Arquitectonicas

- **React Clean Architecture**: Se ha estructurado el directorio `src/` separando estrictamente la logica global (`src/shared/`, `src/ui/`) de las caracteristicas de dominio (`src/modules/`).
- **Sistema de Pestañas Persistentes**: Construido con Zustand y persistencia local, capaz de restaurar sesiones al reabrir la aplicacion. 
- **Enrutamiento Hibrido**: Uso integrado de `react-router` para la navegacion interna dentro de las pestañas, separando el estado global de navegacion del estado de UI.

## Infraestructura y CI/CD

- **GitHub Actions**: Workflow de integracion continua y despliegue (CI/CD) completamente configurado. Cada tag en el repositorio desencadena una compilacion en multiples plataformas (Windows, Linux, macOS) de forma paralela.
- **OTA Updates**: El pipeline genera los artefactos de actualizacion y sus respectivas firmas criptograficas. Tauri los consume para desplegar parches en caliente (Over The Air) a los usuarios finales.

```yaml
# Fragmento del Pipeline CI/CD (GitHub Actions)
- name: Read release notes
  id: notes
  shell: bash
  run: |
      EOF=$(dd if=/dev/urandom bs=15 count=1 status=none | base64)
      echo "body<<$EOF" >> "$GITHUB_OUTPUT"
      cat releases/latest.md >> "$GITHUB_OUTPUT"
      echo "$EOF" >> "$GITHUB_OUTPUT"
```

## Tecnologias Clave y Plugins

Para lograr una experiencia de escritorio premium, se integraron los siguientes pilares:

### Frontend (Vite + React)
- `zustand`: Manejo de estado del cliente rapido y desacoplado (usado en el gestor de notas y en el sistema de tabs).
- `react-router` (v8): Para la renderizacion de vistas dentro del canvas central.
- `motion`: Animaciones fluidas, como la microinteraccion de abrir/cerrar y reordenar pestañas.
- `streamdown` + `front-matter`: Para la interpretacion de markdown y la extraccion de la metadata (usada para esta misma vista de notas).
- `sonner`: Componente base de notificaciones toast.
- `lucide-react`: Sistema de iconografia base.

### Backend (Tauri + Rust)
- `tauri-plugin-updater`: API integrada con nuestros endpoints para detectar actualizaciones del binario.
- `tauri-plugin-process`: Habilita el reinicio programmatico (`relaunch`) tras una actualizacion.
- `window-vibrancy`: Implementacion nativa de opacidad y *glassmorphism* (blur) en macOS y configuraciones especiales de acrilico en Windows.

## Estructura de Directorios (Clean Architecture)

El desarrollo del dominio (ej. autenticacion, flujos de automatizacion, notas de version) debera realizarse dentro de `src/modules` utilizando la siguiente segregacion de capas:

```bash
src/
├── modules/
│   ├── release-notes/
│   │   ├── core/           # Interfaces y Entidades (puro)
│   │   ├── infrastructure/ # Adaptadores externos (APIs)
│   │   └── ui/             # ViewModels, Hooks, Screens
│   └── home/
├── shared/                 # Configuraciones Globales (Router, Utils)
└── ui/                     # Atoms, Molecules y estilos (Tailwind)
```

## Siguientes Pasos

Con la arquitectura de componentes base consolidada, el proximo esfuerzo se centrara en instalar y adaptar la libreria `@xyflow/react` para fabricar el primer sistema de Canvas y dotar de interactividad a los nodos de logica de negocio.
