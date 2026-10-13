import { workflows } from './modules/workflows';
import { execution } from './modules/execution';
import { runs } from './modules/runs';
import { whatsapp } from './modules/whatsapp';
import { window, system } from './modules/window';
import { config } from './modules/config';
import { events } from './modules/events';
import { dialog } from './modules/dialog';
import { scheduler } from './modules/scheduler';
import { profile } from './modules/profile';
import { path } from './modules/path';
import { notifications } from './modules/notifications';

export const api = {
  workflows,
  execution,
  runs,
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

export { CONFIG_CHANGED_EVENT } from './modules/config';
export * from './types';
