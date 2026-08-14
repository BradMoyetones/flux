import { invoke } from '@tauri-apps/api/core';

export const notifications = {
  testNotification: () => invoke<void>('cmd_test_notification'),
};
