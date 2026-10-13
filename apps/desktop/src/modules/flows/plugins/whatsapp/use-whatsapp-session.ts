import { useState, useCallback, useEffect } from 'react';
import { api, type WhatsAppSessionInfo } from '@flux/api';

export interface WaContact {
    jid: string;
    name: string;
    phone: string;
}

export interface WaChat {
    jid: string;
    name: string;
}

export interface WaGroup {
    jid: string;
    name: string;
}

interface UseWhatsAppSessionReturn {
    sessions: WhatsAppSessionInfo[];
    loading: boolean;
    error: string | null;
    /** Contactos por sessionId */
    contacts: Record<string, WaContact[]>;
    /** Chats por sessionId */
    chats: Record<string, WaChat[]>;
    /** Grupos por sessionId */
    groups: Record<string, WaGroup[]>;
    /** QR URL para una sesión (para SSE) */
    qrUrl: string | null;
    /** Sesión que se está vinculando actualmente */
    linkingSessionId: string | null;
    startSession: (sessionId: string) => Promise<WhatsAppSessionInfo | null>;
    stopSession: (sessionId: string) => Promise<void>;
    deleteSession: (sessionId: string) => Promise<void>;
    refreshSessions: () => Promise<void>;
    getStatus: (sessionId: string) => Promise<{ connected: boolean; jid: string } | null>;
    fetchContacts: (sessionId: string) => Promise<WaContact[]>;
    fetchChats: (sessionId: string) => Promise<WaChat[]>;
    fetchGroups: (sessionId: string) => Promise<WaGroup[]>;
    setLinkingSessionId: (id: string | null) => void;
}

export function useWhatsAppSession(): UseWhatsAppSessionReturn {
    const [sessions, setSessions] = useState<WhatsAppSessionInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [contacts, setContacts] = useState<Record<string, WaContact[]>>({});
    const [chats, setChats] = useState<Record<string, WaChat[]>>({});
    const [groups, setGroups] = useState<Record<string, WaGroup[]>>({});
    const [qrUrl, setQrUrl] = useState<string | null>(null);
    const [linkingSessionId, setLinkingSessionId] = useState<string | null>(null);

    // ──── Refresh sessions ────
    const refreshSessions = useCallback(async () => {
        try {
            const result = await api.whatsapp.listSessions();
            // Enrich with live status
            const enriched: WhatsAppSessionInfo[] = [];
            for (const s of result) {
                try {
                    const status = await api.whatsapp.proxyRequest<{ connected: boolean; jid: string }>(s.id, 'GET', '/status');
                    enriched.push({ ...s, connected: status.connected, jid: status.jid || null });
                } catch {
                    enriched.push(s);
                }
            }
            setSessions(enriched);
        } catch (e) {
            console.error('Error listing WA sessions:', e);
        }
    }, []);

    // ──── Start session ────
    const startSession = useCallback(async (sessionId: string): Promise<WhatsAppSessionInfo | null> => {
        setLoading(true);
        setError(null);
        try {
            const result = await api.whatsapp.startSession(sessionId);
            const url = await api.whatsapp.getQrUrl(sessionId);
            setQrUrl(url);
            setLinkingSessionId(sessionId);
            await refreshSessions();
            return result;
        } catch (e: any) {
            const msg = typeof e === 'string' ? e : e.message || 'Error starting session';
            setError(msg);
            return null;
        } finally {
            setLoading(false);
        }
    }, [refreshSessions]);

    // ──── Stop session ────
    const stopSession = useCallback(async (sessionId: string) => {
        try {
            await api.whatsapp.stopSession(sessionId);
            setQrUrl(null);
            if (linkingSessionId === sessionId) setLinkingSessionId(null);
            await refreshSessions();
        } catch (e: any) {
            setError(typeof e === 'string' ? e : e.message || 'Error stopping session');
        }
    }, [linkingSessionId, refreshSessions]);

    // ──── Delete session ────
    const deleteSession = useCallback(async (sessionId: string) => {
        try {
            await api.whatsapp.deleteSession(sessionId);
            setQrUrl(null);
            if (linkingSessionId === sessionId) setLinkingSessionId(null);
            await refreshSessions();
        } catch (e: any) {
            setError(typeof e === 'string' ? e : e.message || 'Error deleting session');
        }
    }, [linkingSessionId, refreshSessions]);

    // ──── Get status ────
    const getStatus = useCallback(async (sessionId: string) => {
        try {
            return await api.whatsapp.proxyRequest<{ connected: boolean; jid: string }>(sessionId, 'GET', '/status');
        } catch {
            return null;
        }
    }, []);

    // ──── Fetch contacts ────
    const fetchContacts = useCallback(async (sessionId: string): Promise<WaContact[]> => {
        try {
            const raw = await api.whatsapp.proxyRequest<Record<string, { PushName?: string; FullName?: string; FirstName?: string; BusinessName?: string }>>(sessionId, 'GET', '/contacts');

            // whatsmeow returns a map of JID -> ContactInfo
            const parsed: WaContact[] = Object.entries(raw).map(([jid, info]) => {
                const name = info.PushName || info.FullName || info.FirstName || info.BusinessName || '';
                // Extract phone from JID: "573001234567@s.whatsapp.net" -> "+573001234567"
                const phone = jid.includes('@') ? `+${jid.split('@')[0]}` : jid;
                return { jid, name, phone };
            }).filter(c => c.name && !c.jid.includes('g.us')); // Filter out groups and empty names

            // Sort by name
            parsed.sort((a, b) => a.name.localeCompare(b.name));

            setContacts(prev => ({ ...prev, [sessionId]: parsed }));
            return parsed;
        } catch (e) {
            console.error('Error fetching contacts:', e);
            return [];
        }
    }, []);

    // ──── Fetch chats ────
    const fetchChats = useCallback(async (sessionId: string): Promise<WaChat[]> => {
        try {
            const raw = await api.whatsapp.proxyRequest<Array<{ jid: string; name?: string }>>(sessionId, 'GET', '/chats');

            const parsed: WaChat[] = (Array.isArray(raw) ? raw : []).map(c => ({
                jid: c.jid || '',
                name: c.name || c.jid || '',
            }));

            setChats(prev => ({ ...prev, [sessionId]: parsed }));
            return parsed;
        } catch (e) {
            console.error('Error fetching chats:', e);
            return [];
        }
    }, []);

    // ──── Fetch groups ────
    const fetchGroups = useCallback(async (sessionId: string): Promise<WaGroup[]> => {
        try {
            const raw = await api.whatsapp.proxyRequest<Array<{ jid: string; name?: string }>>(sessionId, 'GET', '/groups');

            const parsed: WaGroup[] = (Array.isArray(raw) ? raw : []).map(g => ({
                jid: g.jid || '',
                name: g.name || g.jid || '',
            }));

            setGroups(prev => ({ ...prev, [sessionId]: parsed }));
            return parsed;
        } catch (e) {
            console.error('Error fetching groups:', e);
            return [];
        }
    }, []);

    // ──── Auto-refresh on mount ────
    useEffect(() => {
        refreshSessions();
    }, [refreshSessions]);

    return {
        sessions,
        loading,
        error,
        contacts,
        chats,
        groups,
        qrUrl,
        linkingSessionId,
        startSession,
        stopSession,
        deleteSession,
        refreshSessions,
        getStatus,
        fetchContacts,
        fetchChats,
        fetchGroups,
        setLinkingSessionId,
    };
}
