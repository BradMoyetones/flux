use std::fs;
use std::path::PathBuf;
use walkdir::WalkDir;
use crate::models::workflow::Workflow;

pub fn scan_workspaces(workspaces: Vec<String>) -> Result<Vec<Workflow>, String> {
    let mut workflows = Vec::new();

    for workspace in workspaces {
        for entry in WalkDir::new(&workspace).into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(content) = fs::read_to_string(path) {
                    // Intenta parsearlo como Workflow
                    if let Ok(workflow) = serde_json::from_str::<Workflow>(&content) {
                        workflows.push(workflow);
                    }
                }
            }
        }
    }

    Ok(workflows)
}

pub fn save_workflow(path: &str, workflow: &Workflow) -> Result<(), String> {
    let content = serde_json::to_string_pretty(workflow).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}
