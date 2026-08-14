import { invoke } from '@tauri-apps/api/core';

export const profile = {
  processAndSaveAvatar: (filePath: string) => invoke<string>('process_and_save_avatar', { filePath }),
};
