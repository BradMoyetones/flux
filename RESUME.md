# Resumen y Documentación de Arquitectura de Flux
*Narrado desde la perspectiva del desarrollador principal.*

## 1. Visión y Contexto del Proyecto

Flux nació como un motor de automatización y orquestación de workflows basado en nodos (estilo n8n o Zapier), pero empaquetado como una aplicación de escritorio super rápida y nativa gracias a **Tauri v2** (Rust + React).

Inicialmente había programado un borrador funcional para el backend, pero me di cuenta de que si quería escalar esto masivamente a futuro (con múltiples nodos y un rendimiento impecable), el backend requería una reescritura total. Por eso decidimos tirarlo todo y empezar de cero con una arquitectura altamente escalable, separando el motor de ejecución, la capa de plugins, los modelos de datos y el almacenamiento.

**Filosofía Local-First:**
Tomé la decisión arquitectónica de **no usar SQLite** ni bases de datos complicadas. Quería que Flux se sintiera limpio y nativo: la información es 100% del usuario. Por tanto, los Workspaces de Flux son simplemente carpetas en el disco duro del usuario, y los flujos son archivos JSON con extensión **`.flux`**. Flux solo necesita saber las rutas de las carpetas a escanear, y todo el almacenamiento depende del OS, brindando seguridad y transparencia al usuario.

---

## 2. Arquitectura del Backend (Rust)

El backend en Rust (ubicado en `src-tauri/src/`) se estructuró para ser el núcleo pesado y seguro de la aplicación. Lo dividimos en módulos muy bien pensados:

### A. Modelos de Datos (`models/workflow.rs`)
Definimos estructuras estrictas usando `serde` para mapear los archivos `.flux` hacia memoria.
- `Workflow`: La entidad principal que representa un archivo, contiene metadatos, triggers y listas de nodos y aristas (edges). Le inyectamos dinámicamente un campo `path` temporal para que el frontend sepa de dónde viene.
- `Node` y `Edge`: Representan los bloques del diagrama. El `Node` ahora incluye `position: Option<XYPosition>` para guardar las coordenadas visuales del frontend y asegurar que al abrir un archivo, los nodos se ubiquen exactamente donde se dejaron.

### B. Almacenamiento y Escaneo (`storage/`)
- **`file_scanner.rs`**: Aquí implementamos la lectura recursiva del disco. Utilizo la librería `walkdir` para entrar a las rutas de los workspaces y buscar estrictamente archivos con extensión `.flux`. 
- Además, implementamos la función de guardado `save_workflow`, la cual blindamos para que rechace guardar si no recibe una **ruta absoluta** (`PathBuf::is_absolute()`). Esto solucionó un bug crítico (`os error 2`) donde el sistema guardaba archivos por error en el `current_dir` del proyecto.
- **`settings.rs`**: Un micro-almacenamiento (usando `tauri-plugin-store`) exclusivo para guardar únicamente las rutas de los Workspaces vinculados.

### C. Motor de Ejecución (`core/executor.rs`)
Es el corazón de Flux. Cuando el frontend manda a ejecutar un flujo, el executor:
1. Mapea la ejecución usando grafos dirigidos acíclicos (DAG) con la dependencia `petgraph`.
2. Ordena los nodos de forma topológica para saber exactamente quién debe ejecutarse antes que quién (basado en cómo conectó las flechas el usuario).
3. Utiliza asincronía (`tokio::spawn`) para que la ejecución pesada de red no bloquee la interfaz de usuario de Tauri.
4. Emite eventos en tiempo real al frontend usando `app.emit("workflow://node-status")` para inyectarle un efecto visual de "loading", "success" o "error" a los nodos en React Flow.

### D. Capa de Plugins (`plugins/registry.rs`)
Creamos el trait `NodePlugin`, una interfaz abstracta que fuerza a cualquier nodo nuevo que yo invente a implementar dos métodos: `node_type()` (ej: "http") y `execute()`.
Esto permite que el motor de ejecución simplemente busque el plugin en un registro y le pase los parámetros (el `config` del nodo) sin saber de qué trata, logrando una arquitectura de escalabilidad horizontal donde añadir el nodo de WhatsApp, Gmail o Excel será tan simple como crear un archivo nuevo que implemente el Trait.

### E. Comandos IPC (Inter-Process Communication)
Esta es la pasarela por donde React habla con Rust. Expusimos los siguientes comandos en `commands/`:
- `cmd_get_workspaces`: Recupera la lista de carpetas vinculadas.
- `cmd_add_workspace` / `cmd_remove_workspace`: Administra el store de carpetas vinculadas.
- `cmd_scan_workflows`: Lee los workspaces y devuelve todos los archivos `.flux` parseados a JSON.
- `cmd_get_workflow`: Lee un archivo `.flux` específico y lo manda al frontend.
- `cmd_save_workflow`: Recibe el JSON modificado desde React Flow y lo serializa en disco.
- `cmd_execute_workflow`: Detona el DAG Executor.

*(Los plugins de permisos también fueron debidamente registrados, incluyendo `dialog` y `fs` en los capabilities de Tauri v2).*

---

## 3. Arquitectura del Frontend (React + Shadcn)

El frontend está estructurado para ser una interfaz altamente estética, responsiva y reactiva:

### A. HomeView y Gestión Nativa
El Home fue diseñado para agrupar los archivos `.flux` según el Workspace (carpeta) al que pertenecen. 
- Implementé el uso de **Tauri Dialogs** (`open` y `save`) para la selección nativa de carpetas usando el explorador del sistema operativo.
- Usamos componentes de **Shadcn UI** (Dialog, Select, Button) para construir modales estéticos (como `CreateFlowDialog`), los cuales incluso detectan desde qué workspace abrí el modal y me lo auto-seleccionan. Al crear, utiliza el plugin `@tauri-apps/api/path` para concatenar rutas de forma segura en cualquier OS y manda a invocar a Rust para escribir el `.flux`.

### B. Enrutamiento Dinámico
Modifiqué el `tab-routes.tsx` para aceptar rutas del tipo `/flows/:pathId`. Así, al abrir un flujo, la URL incluye el path absoluto de la computadora y la pestaña recupera automáticamente el nombre del archivo.

### C. React Flow y Zustand
Todo el estado global del canvas está en `useFlowStore.ts`.
- **Hidratación:** Al entrar a la ruta, un hook dispara `cmd_get_workflow`, mapea los nodos a la estructura de React Flow, inyecta las `XYPositions` guardadas por Rust, y el canvas recarga mágicamente tu archivo.
- **Listeners:** El store se suscribe al evento `workflow://node-status` emitido por el DAG Executor en Rust, actualizando el estado individual de cada nodo (loading, success, error) y mostrando spinners e indicadores brillantes en vivo, sin re-renderizar todo el canvas, gracias a Zustand.

### D. Foundation para los Plugins en UI
Finalmente, hemos sentado las bases para configurar visualmente cada nodo. Hemos integrado **Zod** y **React Hook Form**. Ya existe un esquema (`httpNodeSchema`) en `schema.ts`, el cual dictará cómo se autogenerarán de forma estricta y tipada los paneles laterales de configuración del nodo cuando un usuario decida alterar, por ejemplo, la URL o el Method de un HTTP Request.

---

**Conclusión del Estado Actual:** 
Tenemos una infraestructura híbrida, robusta, 100% tipada (los tipos en TS replican exactamente los structs en Rust), basada en el filesystem local del usuario, y con el andamiaje listo para empezar a crear lógica pesada en los plugins y menús laterales dinámicos sin romper la escalabilidad.
