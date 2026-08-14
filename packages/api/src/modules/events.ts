import { listen, type EventCallback, type UnlistenFn } from '@tauri-apps/api/event';

export const events = {
  listen: <T>(event: string, handler: EventCallback<T>): Promise<UnlistenFn> => {
    return listen<T>(event, handler);
  }
};
