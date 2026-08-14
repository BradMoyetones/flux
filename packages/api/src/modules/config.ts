import { invoke } from '@tauri-apps/api/core';
import type { AppConfig, GlobalVariable } from '../types';

export const config = {
  getConfig: () => invoke<AppConfig>('cmd_get_config'),
  updateConfig: (config: AppConfig) => invoke<void>('cmd_update_config', { config }),
  getGlobalVariables: () => invoke<GlobalVariable[]>('cmd_get_global_variables'),
  setGlobalVariables: (variables: GlobalVariable[]) => invoke<void>('cmd_set_global_variables', { variables }),
  factoryReset: (restart: boolean = false) => invoke<void>('cmd_factory_reset', { restart }),
};
