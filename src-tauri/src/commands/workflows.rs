use tauri::{AppHandle, command};
use crate::models::workflow::Workflow;
use crate::storage::settings::{add_workspace, get_workspaces, remove_workspace};
use crate::storage::file_scanner::scan_workspaces;

#[command]
pub fn cmd_get_workspaces(app: AppHandle) -> Result<Vec<String>, String> {
    get_workspaces(&app)
}

#[command]
pub fn cmd_add_workspace(app: AppHandle, path: String) -> Result<(), String> {
    add_workspace(&app, path)
}

#[command]
pub fn cmd_remove_workspace(app: AppHandle, path: String) -> Result<(), String> {
    remove_workspace(&app, path)
}

#[command]
pub fn cmd_scan_workflows(app: AppHandle) -> Result<Vec<Workflow>, String> {
    let workspaces = get_workspaces(&app)?;
    scan_workspaces(workspaces)
}
