import { invoke } from '@tauri-apps/api/core';
import { platform, type } from '@tauri-apps/plugin-os';

import { getCurrentWindow } from '@tauri-apps/api/window';

export const window = {
  getCurrentWindow,
  minimize: () => invoke<void>('minimize_window'),
  close: () => invoke<void>('close_window'),
  closeSplashscreen: () => invoke<void>('close_splashscreen'),
  toggleFullscreen: () => invoke<void>('toggle_fullscreen'),
  setRunInBackground: (runInBackground: boolean) => invoke<void>('set_run_in_background', { runInBackground }),
  getTerminalHistory: () => invoke<string[]>('cmd_get_terminal_history'),
};

export const system = {
  platform: () => platform(),
  type: () => type(),
};
