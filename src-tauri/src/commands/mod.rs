pub mod window;
pub mod workflows;
pub mod execution;

pub fn get_handlers() -> impl Fn(tauri::ipc::Invoke) -> bool {
    tauri::generate_handler![
        window::minimize_window,
        window::close_window,
        window::toggle_fullscreen,
        workflows::cmd_get_workspaces,
        workflows::cmd_add_workspace,
        workflows::cmd_remove_workspace,
        workflows::cmd_scan_workflows,
        execution::cmd_execute_workflow,
    ]
}
