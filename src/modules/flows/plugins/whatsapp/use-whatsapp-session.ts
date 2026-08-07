import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface WhatsAppSessionInfo {
    id: string;
    port: number;
    connected: boolean;
    jid: string | null;
}

interface UseWhatsAppSessionReturn {
    /** Lista de sesiones activas */
    sessions: WhatsAppSessionInfo[];
    /** Estado de la sesión actual */
    currentSession: WhatsAppSessionInfo | null;
    /** Si está cargando */
    loading: boolean;
    /** Error actual */
    error: string | null;
    /** URL del endpoint QR (para EventSource SSE) */
    qrUrl: string | null;
    /** Iniciar una sesión */
    startSession: (sessionId: string) => Promise<void>;
    /** Detener una sesión */
    stopSession: (sessionId: string) => Promise<void>;
    /** Refrescar la lista de sesiones */
    refreshSessions: () => Promise<void>;
    /** Obtener estado de una sesión */
    getStatus: (sessionId: string) => Promise<WhatsAppSessionInfo | null>;
}

export function useWhatsAppSession(): UseWhatsAppSessionReturn {
    const [sessions, setSessions] = useState<WhatsAppSessionInfo[]>([]);
    const [currentSession, setCurrentSession] = useState<WhatsAppSessionInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [qrUrl, setQrUrl] = useState<string | null>(null);

    const refreshSessions = useCallback(async () => {
        try {
            const result = await invoke<WhatsAppSessionInfo[]>('cmd_wa_list_sessions');
            setSessions(result);
        } catch (e) {
            console.error('Error listing WA sessions:', e);
        }
    }, []);

    const startSession = useCallback(async (sessionId: string) => {
        setLoading(true);
        setError(null);
        setQrUrl(null);
        try {
            const result = await invoke<WhatsAppSessionInfo>('cmd_wa_start_session', { sessionId });
            setCurrentSession(result);
            // Obtener la URL del QR para SSE
            const url = await invoke<string>('cmd_wa_get_qr_url', { sessionId });
            setQrUrl(url);
            await refreshSessions();
        } catch (e: any) {
            setError(typeof e === 'string' ? e : e.message || 'Error starting session');
        } finally {
            setLoading(false);
        }
    }, [refreshSessions]);

    const stopSession = useCallback(async (sessionId: string) => {
        try {
            await invoke('cmd_wa_stop_session', { sessionId });
            if (currentSession?.id === sessionId) {
                setCurrentSession(null);
                setQrUrl(null);
            }
            await refreshSessions();
        } catch (e: any) {
            setError(typeof e === 'string' ? e : e.message || 'Error stopping session');
        }
    }, [currentSession, refreshSessions]);

    const getStatus = useCallback(async (sessionId: string): Promise<WhatsAppSessionInfo | null> => {
        try {
            const result = await invoke<WhatsAppSessionInfo>('cmd_wa_get_status', { sessionId });
            return result;
        } catch {
            return null;
        }
    }, []);

    // Cargar sesiones al montar
    useEffect(() => {
        refreshSessions();
    }, [refreshSessions]);

    return {
        sessions,
        currentSession,
        loading,
        error,
        qrUrl,
        startSession,
        stopSession,
        refreshSessions,
        getStatus,
    };
}
