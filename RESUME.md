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

**Conclusión del Estado Actual (Pre-Fase 5):** 
Tenemos una infraestructura híbrida, robusta, 100% tipada (los tipos en TS replican exactamente los structs en Rust), basada en el filesystem local del usuario, y con el andamiaje listo para empezar a crear lógica pesada en los plugins y menús laterales dinámicos sin romper la escalabilidad.

---

## 4. Fase 5: Plugins, Interpolación y Performance

### A. Fix de Performance (Async Commands)
Detectamos que los comandos IPC (`cmd_scan_workflows`, `cmd_save_workflow`, `cmd_get_workflow`) eran síncronos, lo que bloqueaba el hilo principal de Tauri y congelaba la UI de React mientras se escaneaban carpetas grandes. Los refactorizamos a `async fn` y envolvimos todas las operaciones de I/O pesadas (`WalkDir`, `std::fs::read_to_string`, `std::fs::write`) dentro de `tauri::async_runtime::spawn_blocking`, garantizando que React jamás se congele.

### B. Contratos JSON de Plugins

Diseñamos un sistema de contratos duales: cada plugin tiene un **struct tipado en Rust** (que se deserializa desde el `config: Value` genérico del nodo) y un **schema Zod en TypeScript** (que genera y valida los formularios en el frontend).

#### Nodo HTTP (`plugins/http/`)
El contrato del HTTP Request es exhaustivo y pensado a escala. No es solo URL + Method. Incluye:
- **Autenticación:** Basic Auth, Bearer Token, y API Key (en header o query param), modelado como un enum tagged (`HttpAuth`).
- **Proxy:** URL del proxy con credenciales opcionales.
- **Redirects:** `follow_redirects: bool` + `max_redirects: u32`. Si necesitas desactivar el redirect (ej. para capturar un 302), pones `followRedirects: false`.
- **SSL:** `ignore_ssl_errors: bool` para APIs internas con certs auto-firmados.
- **Query Params:** `HashMap<String, String>` que se adjuntan como `?key=value`.
- **Retry:** `retry_count` y `retry_delay_ms` para reintentar automáticamente ante fallos de red o HTTP 5xx.
- **Cookies:** `persist_cookies: bool` para mantener sesión entre nodos del mismo flujo.
- **Response Type:** `auto | json | text | binary` — el parser de respuesta se adapta.
- **Timeout:** Configurable en milisegundos.

La implementación real del plugin (`plugins/http/plugin.rs`) utiliza `reqwest` con todas estas opciones activas, incluyendo lógica de retry con `try_clone()` y manejo de binary/base64.

#### Nodo WhatsApp (`plugins/whatsapp/`)
Modelado con un enum de acciones (`WhatsAppAction`) que dicta qué campos son requeridos. Soporta: `SendMessage`, `SendMedia`, `GetChats`, `GetMessages`, `GetContacts`, `GetGroupInfo`, `GetProfilePicture`. Incluye filtros por contacto y rango de fechas. La lógica de ejecución devuelve resultados simulados — diseñado para enchufar el SDK real sin modificar el contrato.

### C. Motor de Interpolación (`core/interpolator.rs`)

El sistema de templating permite que la data fluya entre nodos del DAG. La sintaxis es `{{ expresión }}` y soporta:

| Patrón | Ejemplo | Qué resuelve |
|---|---|---|
| `nodeId.data.ruta.json` | `{{api_call.data.body.user}}` | Output del nodo `api_call`, campo `body.user` |
| `global.variable` | `{{global.time_pm}}` | Variable global calculada en runtime |
| `env.VARIABLE` | `{{env.API_KEY}}` | Variable de entorno del sistema operativo |
| Acceso a arrays | `{{api.data.items.0.name}}` | Índice numérico dentro de un array JSON |

**Variables globales disponibles:** `time_pm`, `time_24`, `date`, `datetime`, `timestamp`, `day_name`, `month_name`, `year`, `timeEmoji`.

El `timeEmoji` mapea las **24 posiciones del reloj analógico** (12 horas en punto + 12 medias horas), desde 🕐 (1:00) hasta 🕧 (12:30), basándose en la hora local del sistema.

El interpolador se ejecuta justo antes de que cada plugin procese su configuración dentro del `executor.rs`, aplicándose recursivamente a todo el `Value` JSON (strings, objetos anidados y arrays).

### D. Executor Integrado

El `executor.rs` ahora:
1. Construye un `PluginRegistry` real con HTTP y WhatsApp registrados.
2. Ordena los nodos topológicamente (DAG con `petgraph`).
3. **Interpola** la configuración de cada nodo antes de ejecutarlo.
4. Busca el plugin por `node_type` en el registry y ejecuta.
5. Almacena el resultado en el `ExecutionContext` para que el siguiente nodo lo use.
6. Emite eventos granulares al frontend (`workflow://node-status`) con status, result o error.

### E. Registry Frontend (`plugins/registry.ts`)

Un mapa centralizado en TypeScript donde cada tipo de plugin declara: `schema` (Zod), `defaultConfig`, `label`, `description`, `icon`, `category` y `color`. Esto permite que la Sidebar de plugins y los formularios de configuración se auto-generen sin hardcodear nada.

### F. Frontend: Drag & Drop, Sidebar de Plugins y Panel de Configuración

#### Sidebar de Plugins (`ui/components/sidebar.tsx`)
La sidebar izquierda del canvas fue reescrita para consumir el `pluginRegistry`. Agrupa los nodos disponibles por categoría (`network`, `messaging`, etc.) y cada item es arrastrable al canvas via `dataTransfer` nativo con el tipo `application/flux-node-type`.

#### Nodo WhatsApp (`plugins/whatsapp/whatsapp-node.tsx`)
Se construyó el componente visual del nodo WhatsApp usando los mismos componentes base de Shadcn que el HTTP (`BaseNode`, `BaseNodeHeader`, `NodeStatusIndicator`, `BaseHandle`). Muestra un preview de la acción seleccionada, el número de teléfono y un fragmento del mensaje.

#### NodeTypes Centralizado (`plugins/node-types.ts`)
Se extrajo el mapa `nodeTypes` del canvas a un archivo dedicado. Así, `flow-canvas.tsx` importa `nodeTypes` directamente y cada plugin nuevo solo necesita registrarse en un solo lugar.

#### Panel de Configuración de Nodos (`ui/components/node-config-panel.tsx`)
Al hacer clic en un nodo del canvas, se despliega un panel lateral derecho con el formulario de edición completo del plugin. Los campos se renderizan condicionalmente según el tipo:
- **HTTP:** Method, URL, Content-Type, Body (solo para POST/PUT/PATCH), Response Type, switches de Follow Redirects / Ignore SSL / Persist Cookies, Timeout, Retry count/delay.
- **WhatsApp:** Acción (select condicional), teléfono, mensaje con hint de interpolación `{{ }}`, media path, chat/group ID, y límite de resultados.

#### Flow Canvas (`ui/screens/flow-canvas.tsx`)
Refactorizado para soportar:
- Drag & Drop desde la sidebar (detecta `onDrop` + `screenToFlowPosition`).
- Selección de nodos (`onNodeClick` → abre panel lateral).
- Deselección al hacer clic en el canvas vacío (`onPaneClick`).
- Eliminación del botón "Add" hardcodeado — ahora todo se hace via drag.
