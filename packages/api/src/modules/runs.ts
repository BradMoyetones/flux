import { invoke } from '@tauri-apps/api/core';
import type { RunDetail, RunRecord } from '../types';

/** Historial de ejecuciones (más recientes primero). */
export const runs = {
  list: (workflowId?: string, limit?: number) =>
    invoke<RunRecord[]>('cmd_list_runs', { workflowId: workflowId ?? null, limit: limit ?? null }),
  get: (runId: string) => invoke<RunDetail | null>('cmd_get_run', { runId }),
  /** Borra el historial (los runs en curso se conservan). Devuelve cuántos se borraron. */
  clear: (workflowId?: string) => invoke<number>('cmd_clear_runs', { workflowId: workflowId ?? null }),
};
