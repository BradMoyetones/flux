use std::path::PathBuf;
use ignore::WalkBuilder;

/// Escanea los workspaces y devuelve SOLO las rutas absolutas de los archivos .flux.
/// No lee ningún archivo. Es pura iteración del filesystem, igual que un ls recursivo.
pub fn scan_flux_paths(workspaces: &[String]) -> Vec<FluxEntry> {
    let mut entries = Vec::new();

    for workspace in workspaces {
        let walker = WalkBuilder::new(workspace).build();

        for entry in walker.filter_map(Result::ok) {
                let path = entry.path();

                if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("flux") {
                    let name = path
                        .file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or("sin-nombre")
                        .to_string();

                    entries.push(FluxEntry {
                        name,
                        path: path.to_string_lossy().to_string(),
                        workspace: workspace.clone(),
                    });
                }
        }
    }

    entries
}

/// Guarda un workflow en disco. Requiere ruta absoluta.
pub fn save_workflow_file(path: &str, content: &str) -> Result<(), String> {
    let path_buf = PathBuf::from(path);
    if !path_buf.is_absolute() {
        return Err("Se requiere una ruta absoluta para guardar el workflow".into());
    }
    std::fs::write(path_buf, content).map_err(|e| e.to_string())
}

/// Elimina un archivo .flux del disco. Requiere ruta absoluta.
pub fn delete_workflow_file(path: &str) -> Result<(), String> {
    let path_buf = PathBuf::from(path);
    if !path_buf.is_absolute() {
        return Err("Se requiere una ruta absoluta para eliminar el workflow".into());
    }
    if !path_buf.exists() {
        return Err(format!("El archivo no existe: {}", path));
    }
    std::fs::remove_file(path_buf).map_err(|e| e.to_string())
}

/// Entrada ligera del índice — solo metadatos derivados del filesystem.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FluxEntry {
    pub name: String,
    pub path: String,
    pub workspace: String,
}
