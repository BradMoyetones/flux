use std::fs;
use std::path::PathBuf;
use walkdir::WalkDir;
use crate::models::workflow::Workflow;

pub fn scan_workspaces(workspaces: Vec<String>) -> Result<Vec<Workflow>, String> {
    let mut workflows = Vec::new();

    for workspace in workspaces {
        for entry in WalkDir::new(&workspace).into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("flux") {
                if let Ok(content) = fs::read_to_string(path) {
                    // Intenta parsearlo como Workflow
                    if let Ok(mut workflow) = serde_json::from_str::<Workflow>(&content) {
                        workflow.path = Some(path.to_string_lossy().to_string());
                        workflows.push(workflow);
                    }
                }
            }
        }
    }

    Ok(workflows)
}

pub fn save_workflow(path: &str, workflow: &Workflow) -> Result<(), String> {
    let path_buf = PathBuf::from(path);
    if !path_buf.is_absolute() {
        return Err("Se requiere una ruta absoluta para guardar el workflow".into());
    }
    
    let content = serde_json::to_string_pretty(workflow).map_err(|e| e.to_string())?;
    fs::write(path_buf, content).map_err(|e| e.to_string())?;
    Ok(())
}
