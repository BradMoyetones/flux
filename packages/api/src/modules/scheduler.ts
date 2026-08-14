import { invoke } from '@tauri-apps/api/core';
import type { Workflow } from '../types';

export const scheduler = {
  scheduleWorkflow: (workflow: Workflow) => invoke<void>('cmd_schedule_workflow', { workflow }),
  unscheduleWorkflow: (workflowId: string) => invoke<void>('cmd_unschedule_workflow', { workflowId }),
  listScheduled: () => invoke<string[]>('cmd_list_scheduled'),
};
