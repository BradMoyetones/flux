pub mod window;
pub mod workflows;
pub mod execution;
pub mod whatsapp;
pub mod profile;

pub fn get_handlers() -> impl Fn(tauri::ipc::Invoke) -> bool {
    tauri::generate_handler![
        window::minimize_window,
        window::close_window,
        window::close_splashscreen,
        window::toggle_fullscreen,
        window::set_run_in_background,
        profile::process_and_save_avatar,
        workflows::cmd_get_workspaces,
        workflows::cmd_add_workspace,
        workflows::cmd_remove_workspace,
        workflows::cmd_scan_workflows,
        workflows::cmd_resync_workspaces,
        workflows::cmd_save_workflow,
        workflows::cmd_get_workflow,
        workflows::cmd_register_workflow,
        workflows::cmd_delete_workflow,
        execution::cmd_execute_workflow,
        whatsapp::cmd_wa_start_session,
        whatsapp::cmd_wa_stop_session,
        whatsapp::cmd_wa_delete_session,
        whatsapp::cmd_wa_list_sessions,
        whatsapp::cmd_wa_get_status,
        whatsapp::cmd_wa_get_qr_url,
        whatsapp::cmd_wa_proxy_request,
    ]
}
