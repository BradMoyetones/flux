import { workflows } from './modules/workflows';
import { execution } from './modules/execution';
import { whatsapp } from './modules/whatsapp';
import { window, system } from './modules/window';
import { config } from './modules/config';
import { events } from './modules/events';
import { dialog } from './modules/dialog';
import { scheduler } from './modules/scheduler';
import { profile } from './modules/profile';
import { path } from './modules/path';
import { notifications } from './modules/notifications';
import { LazyStore } from '@tauri-apps/plugin-store';

export const api = {
  workflows,
  execution,
  whatsapp,
  window,
  system,
  config,
  events,
  dialog,
  scheduler,
  profile,
  path,
  notifications,
};

export { LazyStore };
export * from './types';
