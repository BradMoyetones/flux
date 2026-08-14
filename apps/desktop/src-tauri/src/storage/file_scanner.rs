use std::path::PathBuf;
use ignore::WalkBuilder;
use crate::errors::AppError;

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
pub fn save_workflow_file(path: &str, content: &str) -> Result<(), AppError> {
    let path_buf = PathBuf::from(path);
    if !path_buf.is_absolute() {
        return Err(AppError::InvalidConfig("Se requiere una ruta absoluta para guardar el workflow".into()));
    }
    std::fs::write(path_buf, content).map_err(|e| AppError::Storage(e.to_string()))
}

/// Elimina un archivo .flux del disco. Requiere ruta absoluta.
pub fn delete_workflow_file(path: &str) -> Result<(), AppError> {
    let path_buf = PathBuf::from(path);
    if !path_buf.is_absolute() {
        return Err(AppError::InvalidConfig("Se requiere una ruta absoluta para eliminar el workflow".into()));
    }
    if !path_buf.exists() {
        return Err(AppError::Storage(format!("El archivo no existe: {}", path)));
    }
    std::fs::remove_file(path_buf).map_err(|e| AppError::Storage(e.to_string()))
}

/// Renombra un archivo .flux en disco y devuelve la nueva ruta.
pub fn rename_workflow_file(old_path: &str, new_name: &str) -> Result<String, AppError> {
    let old_buf = PathBuf::from(old_path);
    if !old_buf.is_absolute() {
        return Err(AppError::InvalidConfig("Se requiere una ruta absoluta para renombrar el workflow".into()));
    }
    if !old_buf.exists() {
        return Err(AppError::Storage(format!("El archivo no existe: {}", old_path)));
    }
    let parent = old_buf.parent().ok_or_else(|| AppError::InvalidConfig("Ruta sin directorio padre".into()))?;
    
    // Normalize new name (e.g. replacing spaces with hyphens, lowercase)
    let sanitized_name = new_name.replace(" ", "-").to_lowercase();
    let new_buf = parent.join(format!("{}.flux", sanitized_name));

    if new_buf.exists() {
        // Podríamos retornar la ruta existente si es igual, pero por simplicidad de momento:
        if new_buf != old_buf {
            return Err(AppError::Storage("Ya existe un flujo con ese nombre en este workspace".into()));
        }
        return Ok(new_buf.to_string_lossy().to_string());
    }

    std::fs::rename(&old_buf, &new_buf).map_err(|e| AppError::Storage(e.to_string()))?;

    Ok(new_buf.to_string_lossy().to_string())
}

/// Entrada ligera del índice — solo metadatos derivados del filesystem.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FluxEntry {
    pub name: String,
    pub path: String,
    pub workspace: String,
}
