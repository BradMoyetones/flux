import { invoke } from '@tauri-apps/api/core';
import type { Workflow, FluxEntry } from '../types';

export const workflows = {
  getWorkspaces: () => invoke<string[]>('cmd_get_workspaces'),
  addWorkspace: (path: string) => invoke<FluxEntry[]>('cmd_add_workspace', { path }),
  removeWorkspace: (path: string) => invoke<void>('cmd_remove_workspace', { path }),
  scanWorkspaces: () => invoke<FluxEntry[]>('cmd_scan_workflows'),
  resyncWorkspaces: () => invoke<FluxEntry[]>('cmd_resync_workspaces'),
  saveWorkflow: (path: string, workflow: Workflow) => invoke<void>('cmd_save_workflow', { path, workflow }),
  getWorkflow: (path: string) => invoke<Workflow>('cmd_get_workflow', { path }),
  registerWorkflow: (path: string, name: string, workspace: string) => invoke<void>('cmd_register_workflow', { path, name, workspace }),
  deleteWorkflow: (path: string) => invoke<void>('cmd_delete_workflow', { path }),
  renameWorkflow: (oldPath: string, newName: string) => invoke<string>('cmd_rename_workflow', { oldPath, newName }),
};
