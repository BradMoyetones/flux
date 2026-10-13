use std::io::Write;
use std::path::{Component, Path, PathBuf};
use ignore::WalkBuilder;
use serde_json::Value;
use crate::errors::AppError;
use crate::models::workflow::WorkflowMetadata;

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
    write_atomic(&path_buf, content)
}

/// Escritura atómica: escribe a un temporal en el mismo directorio, hace fsync y
/// renombra. Un crash a mitad de escritura nunca deja un `.flux` truncado.
pub fn write_atomic(path: &Path, content: &str) -> Result<(), AppError> {
    let dir = path.parent().ok_or_else(|| AppError::InvalidConfig("Ruta sin directorio padre".into()))?;
    let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("workflow.flux");
    let tmp = dir.join(format!(".{file_name}.tmp-{}", std::process::id()));

    let result = (|| -> std::io::Result<()> {
        let mut f = std::fs::File::create(&tmp)?;
        f.write_all(content.as_bytes())?;
        f.sync_all()?;
        std::fs::rename(&tmp, path)
    })();

    if let Err(e) = result {
        let _ = std::fs::remove_file(&tmp);
        return Err(AppError::Storage(e.to_string()));
    }
    Ok(())
}

/// Garantiza que `path` es un `.flux` dentro de uno de los workspaces registrados.
/// Protege los comandos de lectura/escritura/borrado frente a rutas arbitrarias
/// (`..`, symlinks, otras carpetas del disco).
pub fn ensure_workflow_path(workspaces: &[String], path: &str) -> Result<(), AppError> {
    let p = Path::new(path);
    if !p.is_absolute() {
        return Err(AppError::InvalidConfig("Se requiere una ruta absoluta".into()));
    }
    if p.extension().and_then(|e| e.to_str()) != Some("flux") {
        return Err(AppError::InvalidConfig("Solo se permiten archivos .flux".into()));
    }
    if p.components().any(|c| matches!(c, Component::ParentDir)) {
        return Err(AppError::InvalidConfig("La ruta no puede contener '..'".into()));
    }

    let file_name = p.file_name().ok_or_else(|| AppError::InvalidConfig("Ruta sin nombre de archivo".into()))?;
    let parent = p.parent().ok_or_else(|| AppError::InvalidConfig("Ruta sin directorio padre".into()))?;
    let canon_parent = parent
        .canonicalize()
        .map_err(|e| AppError::Storage(format!("Directorio inválido '{}': {e}", parent.display())))?;
    let candidate = canon_parent.join(file_name);
    // Si el archivo ya existe y es un symlink, validamos su destino real.
    let candidate = if candidate.exists() {
        candidate.canonicalize().map_err(|e| AppError::Storage(e.to_string()))?
    } else {
        candidate
    };

    let allowed = workspaces
        .iter()
        .filter_map(|w| Path::new(w).canonicalize().ok())
        .any(|w| candidate.starts_with(&w));

    if allowed {
        Ok(())
    } else {
        Err(AppError::InvalidConfig("La ruta está fuera de los workspaces registrados".into()))
    }
}

/// Lee el `.flux` de disco y devuelve su bloque `metadata` (si existe), para que un
/// guardado desde el editor nunca pise las estadísticas de ejecución del backend.
pub fn read_disk_metadata(path: &str) -> Option<Value> {
    let content = std::fs::read_to_string(path).ok()?;
    let value: Value = serde_json::from_str(&content).ok()?;
    value.get("metadata").cloned()
}

/// Actualiza SOLO `metadata.last_execution` y `metadata.total_executions` del `.flux`
/// que hay actualmente en disco (no el snapshot en memoria del ejecutor).
/// Devuelve `None` — sin escribir nada — si el archivo ya no existe, no se puede
/// leer, o ahora contiene otro workflow (renombrado/movido/reemplazado).
pub fn touch_workflow_metadata(path: &str, workflow_id: &str) -> Option<WorkflowMetadata> {
    let content = std::fs::read_to_string(path).ok()?;
    let mut value: Value = serde_json::from_str(&content).ok()?;
    if value.get("id").and_then(|v| v.as_str()) != Some(workflow_id) {
        return None;
    }

    let mut meta: WorkflowMetadata = value
        .get("metadata")
        .and_then(|m| serde_json::from_value(m.clone()).ok())
        .unwrap_or_default();
    meta.last_execution = Some(chrono::Utc::now().to_rfc3339());
    meta.total_executions += 1;

    value["metadata"] = serde_json::to_value(&meta).ok()?;
    let out = serde_json::to_string_pretty(&value).ok()?;
    write_atomic(Path::new(path), &out).ok()?;
    Some(meta)
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
    // Solo caracteres seguros: nunca separadores de ruta ni '..'
    let sanitized_name: String = new_name
        .trim()
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect();
    let sanitized_name = sanitized_name.trim_matches('-').to_string();
    if sanitized_name.is_empty() {
        return Err(AppError::InvalidConfig("El nombre del flujo no es válido".into()));
    }
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

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_workspace(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("flux-test-{tag}-{}-{}", std::process::id(), uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        dir.canonicalize().unwrap()
    }

    #[test]
    fn path_validation_only_allows_flux_files_inside_workspaces() {
        let ws = temp_workspace("paths");
        let outside = temp_workspace("outside");
        let workspaces = vec![ws.to_string_lossy().to_string()];

        let ok = ws.join("a.flux");
        assert!(ensure_workflow_path(&workspaces, ok.to_str().unwrap()).is_ok());

        // fuera del workspace
        assert!(ensure_workflow_path(&workspaces, outside.join("a.flux").to_str().unwrap()).is_err());
        // extensión incorrecta
        assert!(ensure_workflow_path(&workspaces, ws.join("passwd").to_str().unwrap()).is_err());
        assert!(ensure_workflow_path(&workspaces, ws.join("a.json").to_str().unwrap()).is_err());
        // traversal
        let sneaky = format!("{}/../{}/a.flux", ws.display(), outside.file_name().unwrap().to_string_lossy());
        assert!(ensure_workflow_path(&workspaces, &sneaky).is_err());
        // relativa
        assert!(ensure_workflow_path(&workspaces, "a.flux").is_err());
        // un workspace con prefijo parecido no cuenta como "dentro"
        let sibling = PathBuf::from(format!("{}-evil", ws.display()));
        std::fs::create_dir_all(&sibling).unwrap();
        assert!(ensure_workflow_path(&workspaces, sibling.join("a.flux").to_str().unwrap()).is_err());

        let _ = std::fs::remove_dir_all(&ws);
        let _ = std::fs::remove_dir_all(&outside);
        let _ = std::fs::remove_dir_all(&sibling);
    }

    #[cfg(unix)]
    #[test]
    fn symlink_escaping_the_workspace_is_rejected() {
        let ws = temp_workspace("symlink");
        let outside = temp_workspace("symlink-target");
        let target = outside.join("secret.flux");
        std::fs::write(&target, "{}").unwrap();
        let link = ws.join("link.flux");
        std::os::unix::fs::symlink(&target, &link).unwrap();

        let workspaces = vec![ws.to_string_lossy().to_string()];
        assert!(ensure_workflow_path(&workspaces, link.to_str().unwrap()).is_err());

        let _ = std::fs::remove_dir_all(&ws);
        let _ = std::fs::remove_dir_all(&outside);
    }

    #[test]
    fn touch_metadata_updates_only_metadata_and_keeps_user_edits() {
        let ws = temp_workspace("meta");
        let file = ws.join("w.flux");
        std::fs::write(
            &file,
            r#"{"id":"abc","name":"Editado por el usuario","extra":42,"nodes":[],"edges":[],"trigger":{"type":"manual"}}"#,
        )
        .unwrap();
        let path = file.to_str().unwrap();

        let meta = touch_workflow_metadata(path, "abc").unwrap();
        assert_eq!(meta.total_executions, 1);
        let meta = touch_workflow_metadata(path, "abc").unwrap();
        assert_eq!(meta.total_executions, 2);

        let v: Value = serde_json::from_str(&std::fs::read_to_string(&file).unwrap()).unwrap();
        assert_eq!(v["name"], "Editado por el usuario"); // contenido del usuario intacto
        assert_eq!(v["extra"], 42);                      // campos desconocidos preservados
        assert_eq!(v["metadata"]["total_executions"], 2);

        // otro workflow ocupa esa ruta → no se toca
        assert!(touch_workflow_metadata(path, "otro-id").is_none());
        // archivo inexistente (renombrado/borrado) → no se recrea
        let gone = ws.join("gone.flux");
        assert!(touch_workflow_metadata(gone.to_str().unwrap(), "abc").is_none());
        assert!(!gone.exists());

        let _ = std::fs::remove_dir_all(&ws);
    }

    #[test]
    fn rename_sanitizes_the_new_name() {
        let ws = temp_workspace("rename");
        let old = ws.join("a.flux");
        std::fs::write(&old, "{}").unwrap();

        let new_path = rename_workflow_file(old.to_str().unwrap(), "../../Mi Flujo/Ventas").unwrap();
        let new_path = PathBuf::from(new_path);
        assert_eq!(new_path.parent().unwrap(), ws.as_path()); // nunca escapa del directorio
        assert_eq!(new_path.file_name().unwrap(), "mi-flujo-ventas.flux");

        let _ = std::fs::remove_dir_all(&ws);
    }

    #[test]
    fn atomic_write_replaces_content_and_leaves_no_temp_files() {
        let ws = temp_workspace("atomic");
        let file = ws.join("w.flux");
        write_atomic(&file, "uno").unwrap();
        write_atomic(&file, "dos").unwrap();
        assert_eq!(std::fs::read_to_string(&file).unwrap(), "dos");
        let leftovers: Vec<_> = std::fs::read_dir(&ws).unwrap().filter_map(Result::ok).collect();
        assert_eq!(leftovers.len(), 1);
        let _ = std::fs::remove_dir_all(&ws);
    }
}
