import { invoke } from '@tauri-apps/api/core';
import type { WhatsAppSessionInfo } from '../types';

export const whatsapp = {
  startSession: (sessionId: string) => invoke<WhatsAppSessionInfo>('cmd_wa_start_session', { sessionId }),
  stopSession: (sessionId: string) => invoke<void>('cmd_wa_stop_session', { sessionId }),
  deleteSession: (sessionId: string) => invoke<void>('cmd_wa_delete_session', { sessionId }),
  listSessions: () => invoke<WhatsAppSessionInfo[]>('cmd_wa_list_sessions'),
  getStatus: (sessionId: string) => invoke<{ connected: boolean; jid: string }>('cmd_wa_get_status', { sessionId }),
  getQrUrl: (sessionId: string) => invoke<string>('cmd_wa_get_qr_url', { sessionId }),
  proxyRequest: <T = unknown>(sessionId: string, method: string, path: string, body?: unknown) =>
    invoke<T>('cmd_wa_proxy_request', { sessionId, method, path, body: body ?? null }),
};
