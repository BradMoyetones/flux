import { invoke } from '@tauri-apps/api/core';
import type { AppConfig, ConfigPatch, GlobalVariable } from '../types';

/** Evento que emite el backend cada vez que la configuración cambia (payload: `AppConfig`). */
export const CONFIG_CHANGED_EVENT = 'config://changed';

export const config = {
  getConfig: () => invoke<AppConfig>('cmd_get_config'),
  /** Única vía de escritura de la configuración. Devuelve la config resultante. */
  patchConfig: (patch: ConfigPatch) => invoke<AppConfig>('cmd_patch_config', { patch }),
  /** Zonas horarias IANA disponibles. */
  listTimezones: () => invoke<string[]>('cmd_list_timezones'),
  getGlobalVariables: () => invoke<GlobalVariable[]>('cmd_get_global_variables'),
  setGlobalVariables: (variables: GlobalVariable[]) => invoke<void>('cmd_set_global_variables', { variables }),
  factoryReset: (restart: boolean = false) => invoke<void>('cmd_factory_reset', { restart }),
};
