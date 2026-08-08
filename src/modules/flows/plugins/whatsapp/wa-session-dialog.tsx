import { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/ui/components/ui/dialog';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { Badge } from '@/ui/components/ui/badge';
import { Separator } from '@/ui/components/ui/separator';
import { ScrollArea } from '@/ui/components/ui/scroll-area';
import { Spinner } from '@/ui/components/ui/spinner';
import { MessageSquare, Plus, Power, PowerOff, RefreshCw, Wifi, Smartphone } from 'lucide-react';
import type { WhatsAppSessionInfo } from './use-whatsapp-session';

interface WaSessionDialogProps {
    sessions: WhatsAppSessionInfo[];
    loading: boolean;
    error: string | null;
    qrUrl: string | null;
    linkingSessionId: string | null;
    onStartSession: (sessionId: string) => Promise<WhatsAppSessionInfo | null>;
    onStopSession: (sessionId: string) => Promise<void>;
    onRefresh: () => Promise<void>;
    onSetLinking: (id: string | null) => void;
    trigger?: React.ReactNode;
}

export function WaSessionDialog({
    sessions,
    loading,
    error,
    qrUrl,
    linkingSessionId,
    onStartSession,
    onStopSession,
    onRefresh,
    onSetLinking,
    trigger,
}: WaSessionDialogProps) {
    const [open, setOpen] = useState(false);
    const [newSessionName, setNewSessionName] = useState('');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);

    // ──── SSE listener for QR ────
    useEffect(() => {
        if (!qrUrl || !linkingSessionId || !open) {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            return;
        }

        setQrCode(null);
        setConnected(false);

        const es = new EventSource(qrUrl);
        eventSourceRef.current = es;

        es.onmessage = (event) => {
            const data = event.data.trim();
            if (data === 'CONNECTED') {
                setConnected(true);
                setQrCode(null);
                es.close();
                eventSourceRef.current = null;
                onRefresh();
                onSetLinking(null);
            } else if (data.length > 0) {
                setQrCode(data);
            }
        };

        es.onerror = () => {
            // SSE reconnects automatically, but if we get an error we just ignore
            // The QR channel might have closed because session connected
        };

        return () => {
            es.close();
            eventSourceRef.current = null;
        };
    }, [qrUrl, linkingSessionId, open, onRefresh, onSetLinking]);

    // ──── Refresh on open ────
    useEffect(() => {
        if (open) onRefresh();
    }, [open, onRefresh]);

    // ──── Create session ────
    const handleCreate = useCallback(async () => {
        const name = newSessionName.trim() || `session-${Date.now()}`;
        setNewSessionName('');
        await onStartSession(name);
    }, [newSessionName, onStartSession]);

    // ──── Stop session ────
    const handleStop = useCallback(async (id: string) => {
        await onStopSession(id);
        if (linkingSessionId === id) {
            setQrCode(null);
            setConnected(false);
        }
    }, [onStopSession, linkingSessionId]);

    // ──── Reconnect / show QR for existing session ────
    const handleLink = useCallback(async (id: string) => {
        await onStartSession(id);
    }, [onStartSession]);

    const activeCount = sessions.filter(s => s.connected).length;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <MessageSquare className="w-4 h-4 text-green-500" />
                        WhatsApp
                        {activeCount > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-400">
                                {activeCount}
                            </Badge>
                        )}
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-green-500" />
                        Sesiones WhatsApp
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    {/* ──── Error ──── */}
                    {error && (
                        <div className="p-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                            {error}
                        </div>
                    )}

                    {/* ──── QR Code Area ──── */}
                    {linkingSessionId && (
                        <div className="flex flex-col items-center gap-3 p-4 rounded-lg border border-dashed border-green-500/30 bg-green-500/5">
                            {connected ? (
                                <>
                                    <div className="flex items-center gap-2 text-green-400">
                                        <Wifi className="w-5 h-5" />
                                        <span className="text-sm font-medium">¡Conectado!</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Sesión <code className="font-mono">{linkingSessionId}</code> vinculada exitosamente.
                                    </p>
                                </>
                            ) : qrCode ? (
                                <>
                                    <p className="text-xs text-muted-foreground text-center">
                                        Escanea este QR con WhatsApp en tu teléfono
                                    </p>
                                    <div className="bg-white p-3 rounded-lg">
                                        <QRCodeSVG value={qrCode} size={220} level="M" />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground text-center">
                                        WhatsApp → <strong>Dispositivos vinculados</strong> → Vincular un dispositivo
                                    </p>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-2 py-4">
                                    <Spinner className="w-6 h-6 text-green-500" />
                                    <p className="text-xs text-muted-foreground">
                                        Iniciando sesión <code className="font-mono">{linkingSessionId}</code>…
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <Separator />

                    {/* ──── Create new session ──── */}
                    <div className="flex gap-2">
                        <Input
                            value={newSessionName}
                            onChange={(e) => setNewSessionName(e.target.value)}
                            placeholder="Nombre de sesión (ej: personal, trabajo)"
                            className="h-8 text-xs flex-1"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                        <Button
                            size="sm"
                            onClick={handleCreate}
                            disabled={loading}
                            className="gap-1 shrink-0"
                        >
                            {loading ? <Spinner className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            Nueva
                        </Button>
                    </div>

                    {/* ──── Sessions list ──── */}
                    <ScrollArea className="max-h-[250px]">
                        <div className="flex flex-col gap-1.5">
                            {sessions.length === 0 ? (
                                <div className="text-center py-6 text-xs text-muted-foreground">
                                    <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    No hay sesiones activas.
                                    <br />Crea una nueva para vincular tu WhatsApp.
                                </div>
                            ) : (
                                sessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className="flex items-center gap-2 p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                    >
                                        {/* Status dot */}
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                                            session.connected
                                                ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
                                                : 'bg-yellow-500/60'
                                        }`} />

                                        {/* Session info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-medium truncate">{session.id}</div>
                                            {session.jid ? (
                                                <div className="text-[10px] text-muted-foreground truncate font-mono">
                                                    {session.jid}
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-yellow-500">
                                                    Sin vincular
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-1 shrink-0">
                                            {!session.connected && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => handleLink(session.id)}
                                                    title="Vincular"
                                                >
                                                    <Power className="w-3 h-3 text-green-500" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => handleStop(session.id)}
                                                title="Desconectar"
                                            >
                                                <PowerOff className="w-3 h-3 text-red-400" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>

                    {/* ──── Footer ──── */}
                    <div className="flex justify-between items-center">
                        <p className="text-[10px] text-muted-foreground">
                            {sessions.length} sesión(es) • {activeCount} conectada(s)
                        </p>
                        <Button variant="ghost" size="sm" onClick={onRefresh} className="gap-1 h-7 text-xs">
                            <RefreshCw className="w-3 h-3" />
                            Actualizar
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
