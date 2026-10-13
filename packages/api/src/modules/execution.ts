import { invoke } from '@tauri-apps/api/core';
import type { ActiveWorkflows, Workflow } from '../types';

export const execution = {
  executeWorkflow: (workflow: Workflow) => invoke<void>('cmd_execute_workflow', { workflow }),
  stopWorkflow: (workflowId: string) => invoke<void>('cmd_stop_workflow', { workflowId }),
  getActiveWorkflows: () => invoke<ActiveWorkflows>('cmd_get_active_workflows'),
};
