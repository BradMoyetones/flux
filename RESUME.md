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

---

## Fase 7 — Bloque 1: Motor HTTP Real + KeyValueBuilder + Drag & Drop Nativo

### Contexto y Motivación
Llegó el momento de ponerle vida real al motor de ejecución DAG. El caso de uso objetivo era un flujo de 3 nodos: un HTTP POST Login que captura cookies de sesión, un HTTP GET que las inyecta para obtener datos, y un WhatsApp que envía esos datos. Para esto necesitaba mejorar el plugin HTTP para que exponga las cookies parseadas y el nodo siguiente pueda referenciarlas con `{{node1.data.cookies.PHPSESSID}}`.

### Cambios en el Backend (Rust)

#### Plugin HTTP Mejorado (`plugins/http/config.rs`)
Añadí dos campos nuevos al contrato:
- **`raw_cookies`** (`Option<String>`): Permite inyectar cookies manualmente con interpolación (ej: `"PHPSESSID={{node1.data.cookies.PHPSESSID}}"`). El plugin las inyecta como header `Cookie` automáticamente.
- **`body_params`** (`HashMap<String, String>`): Pares clave-valor que se serializan automáticamente como body `application/x-www-form-urlencoded` (ej: `txtUsuario=admin&txtClave=123`). Tiene prioridad sobre `body` cuando el content-type es form-urlencoded.

#### Ejecución HTTP con Cookies Parseadas (`plugins/http/plugin.rs`)
La reescritura más importante del Bloque 1:
- **Parseo de `set-cookie`**: Ahora recojo TODOS los headers `set-cookie` (incluyendo duplicados) y los parseo en un mapa `cookies: { "PHPSESSID": "abc123", "token": "xyz456" }`. La función `parse_set_cookies()` extrae `nombre=valor` de cada header, ignorando atributos como `path`, `HttpOnly`, etc.
- **Inyección de `raw_cookies`**: Si el config tiene `rawCookies`, se inyecta como header `Cookie` antes de enviar la petición.
- **Serialización de `bodyParams`**: Cuando el content-type es form-urlencoded y hay bodyParams, se construye el body automáticamente con URL encoding propio (`urlencoded()`).
- **Output reestructurado**: El JSON de salida ahora tiene 4 campos: `statusCode`, `headers`, `cookies` (mapa parseado), y `body`.

### Cambios en el Frontend (React)

#### Componente `KeyValueBuilder` (NUEVO - `ui/components/key-value-builder.tsx`)
Creé un componente reutilizable tipo Postman para editar pares clave-valor. Lo uso en 3 lugares del panel de configuración HTTP:
- **Headers**: Cada header es una fila editable con Key + Value + botón eliminar
- **Query Params**: Mismo patrón
- **Body Form-Urlencoded**: Cuando el Content-Type es `application/x-www-form-urlencoded`, el textarea del body se reemplaza automáticamente por el KeyValueBuilder donde cada fila es un campo del formulario

El componente maneja su propio estado interno (`KVPair[]` con UUIDs) y emite cambios como `Record<string, string>` al padre.

#### Schema HTTP del Frontend (`plugins/http/schema.ts`)
Actualicé el esquema Zod para incluir `rawCookies` (string opcional) y `bodyParams` (record opcional con default `{}`), manteniendo la paridad con el contrato Rust.

#### Panel de Configuración Mejorado (`node-config-panel.tsx`)
- El campo **Body** ahora es condicional: muestra `Textarea` para JSON/plain text, y `KeyValueBuilder` para form-urlencoded. Se detecta por `config.contentType`.
- Se añadió sección **Headers** con `KeyValueBuilder` (antes no se podían editar).
- Se añadió sección **Query Params** con `KeyValueBuilder`.
- Se añadió campo **Cookies (Raw)** con input y hint de interpolación.
- Se importó el `KeyValueBuilder` desde el mismo directorio de componentes.

### Drag & Drop — Migración a API Nativa

Eliminé por completo el `DnDContext`/`DnDProvider` con React state y migré a la API nativa del browser `dataTransfer`:
- **Sidebar**: `event.dataTransfer.setData("application/flux-node-type", plugin.type)` + `effectAllowed = "move"`
- **Canvas (onDrop)**: `event.dataTransfer.getData("application/flux-node-type")` → determinista y síncrono
- **tab-routes.tsx**: Eliminado el wrapper `<DnDProvider>` — ya no es necesario

Esto resuelve el bug donde el nodo no se posicionaba al soltar porque `setType()` (React state async) no se sincronizaba a tiempo con el `onDrop` del mismo frame.


### Compilación
- **Rust** (`cargo check`): ✅ Compila limpio — solo dead code warnings de variantes de error no usadas aún.
- **TypeScript** (`tsc --noEmit`): ✅ Cero errores.

---

## Fase 7 — Bloque 2: WhatsApp Sidecar con whatsmeow (Go)

### Contexto y Decisión Arquitectónica
Para la integración con WhatsApp necesitaba una solución E2E real, no una API cloud como Twilio. Descubrí **whatsmeow** (`go.mau.fi/whatsmeow`), una librería Go que implementa el protocolo Multi-Device de WhatsApp directamente — QR nativo, E2E encryption, persistencia de sesión, envío de media con upload, todo localmente sin servidores terceros.

El problema: ¿cómo integrar Go en una app Tauri que usa Rust + React? La respuesta fue el **patrón Sidecar** de Tauri — un binario externo empaquetado dentro de la app que se ejecuta como proceso hijo. El sidecar de Go expone un servidor HTTP local (puerto aleatorio) con JSON API, y Rust se comunica con él via `reqwest`.

### Arquitectura del Sidecar

```
[React Frontend] ──IPC──▶ [Rust Backend (Tauri)]
                                │
                          ┌─────▼──────┐
                          │ WhatsApp   │
                          │ Manager    │ ◀── Gestiona sesiones
                          └─────┬──────┘
                                │ spawn + HTTP JSON
                          ┌─────▼──────┐
                          │ Go Sidecar │ ◀── whatsmeow
                          │ :random_port│
                          └────────────┘
```

### Archivos Creados y Modificados

#### Go Sidecar (`src-tauri/sidecar/main.go` + `go.mod`)
Programa Go completo que wrappea whatsmeow. Endpoints:
- `GET /status` → `{ "connected": bool, "jid": "573001234567@s.whatsapp.net" }`
- `GET /qr` → SSE stream (Server-Sent Events) que emite QR strings. Al parear, emite `CONNECTED` y cierra.
- `POST /send-message` → `{ "to": "+573001234567", "text": "Hola" }`
- `POST /send-media` → `{ "to": "...", "mediaPath": "/ruta/al/archivo", "caption": "opcional" }` (soporta imagen, video, documento con upload automático a los servidores WA)
- `GET /chats` → Lista de chats
- `GET /contacts` → Contactos del dispositivo
- `POST /disconnect` → Desconecta y cierra sesión

Flags CLI: `--port <port>` y `--db-path <path_to_sqlite>`.

#### Rust: WhatsApp Manager (`services/whatsapp_manager.rs`)
Nuevo módulo de servicios que gestiona las sesiones:
- **`start_session`**: Encuentra un puerto libre (bind TCP :0 + drop), crea el directorio `app_data_dir/whatsapp/`, spawns el sidecar con `app.shell().sidecar("whatsapp-sidecar")`, espera 2 segundos a que el server arranque, y guarda el `CommandChild` en un `Mutex<HashMap>`.
- **`stop_session`**: Mata el proceso hijo y limpia del mapa.
- **`send_request`**: Proxy HTTP genérico (`GET`/`POST`/`PUT`/`DELETE`) hacia el sidecar con `reqwest::Client`.
- **`list_sessions`**: Devuelve info de todas las sesiones activas.

#### Rust: Comandos IPC (`commands/whatsapp.rs`)
5 comandos Tauri nuevos:
- `cmd_wa_start_session` → Inicia el sidecar y retorna la info de sesión
- `cmd_wa_stop_session` → Mata el sidecar
- `cmd_wa_list_sessions` → Lista sesiones activas
- `cmd_wa_get_status` → Proxy a `GET /status` del sidecar
- `cmd_wa_get_qr_url` → Retorna `http://127.0.0.1:{port}/qr` para que el frontend haga SSE

#### Rust: Plugin WhatsApp Actualizado (`plugins/whatsapp/plugin.rs` + `config.rs`)
- Añadido `session_id: Option<String>` y `sidecar_port: Option<u16>` al config.
- El plugin ahora llama al sidecar real via HTTP si `sidecar_port` está presente.
- Si no tiene port (backward compatible), retorna mock response.

#### Frontend: Schema + Hook + Config Panel
- **Schema**: Añadido `sessionId` al schema Zod de WhatsApp con default `"default"`.
- **Hook `useWhatsAppSession`**: Nuevo hook React para start/stop/list/status de sesiones via IPC.
- **Config Panel**: Añadido input de Session ID y nota informativa sobre el flujo de vinculación QR.

#### Configuración Tauri
- **`tauri.conf.json`**: Añadido `"externalBin": ["binaries/whatsapp-sidecar"]` al bundle.
- **`capabilities/default.json`**: Permisos `shell:allow-execute` y `shell:allow-spawn` para el sidecar.
- **`Cargo.toml`**: Dependencia `tauri-plugin-shell = "2"`.
- **`lib.rs`**: Registrado el plugin shell, el módulo `services`, y el `WhatsAppManager` como managed state.

### Compilación
- **Rust** (`cargo check`): ✅ Compila limpio — solo warnings de dead code en `state.rs` (no usado directamente).
- **TypeScript** (`tsc --noEmit`): ✅ Cero errores.

---

## Instrucciones de Instalación del Sidecar WhatsApp

### 1. Instalar Go

#### macOS
```bash
# Opción A: Homebrew (recomendado)
brew install go

# Opción B: Instalador oficial
# Descargar de https://go.dev/dl/ el .pkg para macOS
# Ejecutar el instalador → se instala en /usr/local/go

# Verificar
go version
```

#### Linux (Ubuntu/Debian)
```bash
# Opción A: Snap
sudo snap install go --classic

# Opción B: Descarga directa
wget https://go.dev/dl/go1.22.5.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.22.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Verificar
go version
```

#### Windows
```powershell
# Opción A: Winget
winget install GoLang.Go

# Opción B: Instalador oficial
# Descargar de https://go.dev/dl/ el .msi para Windows
# Ejecutar el instalador → se agrega al PATH automáticamente

# Verificar (reiniciar terminal después de instalar)
go version
```

### 2. Compilar el Sidecar

#### Obtener dependencias
```bash
cd src-tauri/sidecar
go mod tidy
```

#### Compilar según plataforma

##### macOS (Apple Silicon)
```bash
cd src-tauri/sidecar
GOOS=darwin GOARCH=arm64 CGO_ENABLED=1 go build -o ../binaries/whatsapp-sidecar-aarch64-apple-darwin .
```

##### macOS (Intel)
```bash
cd src-tauri/sidecar
GOOS=darwin GOARCH=amd64 CGO_ENABLED=1 go build -o ../binaries/whatsapp-sidecar-x86_64-apple-darwin .
```

##### Linux (x86_64)
```bash
cd src-tauri/sidecar
GOOS=linux GOARCH=amd64 CGO_ENABLED=1 go build -o ../binaries/whatsapp-sidecar-x86_64-unknown-linux-gnu .
```

##### Windows (x86_64)
```powershell
cd src-tauri\sidecar
set GOOS=windows
set GOARCH=amd64
set CGO_ENABLED=1
go build -o ..\binaries\whatsapp-sidecar-x86_64-pc-windows-msvc.exe .
```

> **Nota CGO**: whatsmeow requiere SQLite que usa cgo. En macOS y Linux `CGO_ENABLED=1` funciona directamente. En Windows necesitas tener GCC instalado (ej: via MSYS2/MinGW o TDM-GCC).

### 3. Determinar tu Target Triple
```bash
# Para saber cuál binario necesitas generar:
rustc -Vv | grep host
# Ejemplo output: host: aarch64-apple-darwin
# Entonces compilas con GOOS=darwin GOARCH=arm64
```

### 4. Verificar que todo funciona
```bash
# Desde la raíz del proyecto:
cd src-tauri && cargo check
# Debe compilar sin errores
```

### 5. Ejecutar la app
```bash
# Desde la raíz del proyecto:
pnpm tauri dev
```

Al arrastrar un nodo WhatsApp al canvas y configurar una sesión, el backend spawns el sidecar Go en un puerto aleatorio. El QR aparece via SSE en la UI para vincular tu WhatsApp.
