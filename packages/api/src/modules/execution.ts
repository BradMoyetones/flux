import { invoke } from '@tauri-apps/api/core';
import { Workflow } from '../types';

export const execution = {
  executeWorkflow: (workflow: Workflow) => invoke<void>('cmd_execute_workflow', { workflow }),
  stopWorkflow: (path: string) => invoke<void>('cmd_stop_workflow', { path }),
  getActiveWorkflows: () => invoke<string[]>('cmd_get_active_workflows'),
};
