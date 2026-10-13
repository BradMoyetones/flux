import { open as tauriOpen, save as tauriSave, message as tauriMessage, ask as tauriAsk, confirm as tauriConfirm, type OpenDialogOptions, type SaveDialogOptions, type MessageDialogOptions, type ConfirmDialogOptions } from '@tauri-apps/plugin-dialog';

export const dialog = {
  open: (options?: OpenDialogOptions) => tauriOpen(options),
  save: (options?: SaveDialogOptions) => tauriSave(options),
  message: (message: string, options?: MessageDialogOptions | string) => tauriMessage(message, options),
  ask: (message: string, options?: ConfirmDialogOptions | string) => tauriAsk(message, options),
  confirm: (message: string, options?: ConfirmDialogOptions | string) => tauriConfirm(message, options),
};
