pub mod execution;
pub mod whatsapp;
pub mod window;
pub mod workflow;

pub fn get_handlers() -> impl Fn(tauri::ipc::Invoke<tauri::Wry>) -> bool + Send + Sync + 'static {
    tauri::generate_handler![
        whatsapp::init_whatsapp,
        whatsapp::send_message,
        window::minimize_window,
        window::close_window,
        window::toggle_fullscreen,
        workflow::create_workflow,
        workflow::update_workflow,
        workflow::delete_workflow,
        workflow::list_workflows,
        workflow::get_workflow,
        execution::run_workflow,
        execution::stop_workflow,
        execution::get_execution_status,
    ]
}
