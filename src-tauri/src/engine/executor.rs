use crate::engine::context::PipelineContext;
use crate::models::execution::{ExecutionResult, ExecutionStatus, StepResult, StepStatus};
use crate::models::workflow::Workflow;
use crate::steps;

/// Orquesta la ejecución secuencial de un workflow.
/// Crea un PipelineContext, ejecuta cada step en orden,
/// y almacena el resultado de cada step para que el siguiente pueda acceder a él.
pub struct WorkflowExecutor;

impl WorkflowExecutor {
    /// Ejecuta un workflow completo, paso por paso en secuencia.
    pub async fn execute(workflow: &Workflow) -> ExecutionResult {
        let execution_id = uuid::Uuid::new_v4().to_string();
        let started_at = chrono::Utc::now().to_rfc3339();
        let mut context = PipelineContext::new();
        let mut steps_results: Vec<StepResult> = Vec::new();

        // Ordenar steps por su campo `order`
        let mut sorted_steps = workflow.steps.clone();
        sorted_steps.sort_by_key(|s| s.order);

        for step_config in &sorted_steps {
            // Crear la instancia del step desde su config
            let step = match steps::create_step(step_config) {
                Ok(s) => s,
                Err(e) => {
                    steps_results.push(StepResult {
                        step_id: step_config.id.clone(),
                        step_name: step_config.name.clone(),
                        status: StepStatus::Failed,
                        output: None,
                        error: Some(e.to_string()),
                    });
                    return ExecutionResult {
                        id: execution_id,
                        workflow_id: workflow.id.clone(),
                        status: ExecutionStatus::Failed {
                            step_id: step_config.id.clone(),
                            error: e.to_string(),
                        },
                        steps_results,
                        started_at,
                        finished_at: Some(chrono::Utc::now().to_rfc3339()),
                    };
                }
            };

            // Validar configuración antes de ejecutar
            if let Err(e) = step.validate_config() {
                steps_results.push(StepResult {
                    step_id: step_config.id.clone(),
                    step_name: step_config.name.clone(),
                    status: StepStatus::Failed,
                    output: None,
                    error: Some(e.to_string()),
                });
                return ExecutionResult {
                    id: execution_id,
                    workflow_id: workflow.id.clone(),
                    status: ExecutionStatus::Failed {
                        step_id: step_config.id.clone(),
                        error: e.to_string(),
                    },
                    steps_results,
                    started_at,
                    finished_at: Some(chrono::Utc::now().to_rfc3339()),
                };
            }

            // Ejecutar el step
            match step.execute(&context).await {
                Ok(output) => {
                    // Guardar output en el context para que los siguientes steps lo vean
                    context.set_step_output(&step_config.id, output.clone());
                    steps_results.push(StepResult {
                        step_id: step_config.id.clone(),
                        step_name: step_config.name.clone(),
                        status: StepStatus::Completed,
                        output: Some(output),
                        error: None,
                    });
                }
                Err(e) => {
                    steps_results.push(StepResult {
                        step_id: step_config.id.clone(),
                        step_name: step_config.name.clone(),
                        status: StepStatus::Failed,
                        output: None,
                        error: Some(e.to_string()),
                    });
                    return ExecutionResult {
                        id: execution_id,
                        workflow_id: workflow.id.clone(),
                        status: ExecutionStatus::Failed {
                            step_id: step_config.id.clone(),
                            error: e.to_string(),
                        },
                        steps_results,
                        started_at,
                        finished_at: Some(chrono::Utc::now().to_rfc3339()),
                    };
                }
            }
        }

        ExecutionResult {
            id: execution_id,
            workflow_id: workflow.id.clone(),
            status: ExecutionStatus::Completed,
            steps_results,
            started_at,
            finished_at: Some(chrono::Utc::now().to_rfc3339()),
        }
    }
}
