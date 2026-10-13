import { useState, useEffect, useMemo } from 'react';
import { Input } from '@flux/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@flux/ui';
import { Separator } from '@flux/ui';
import { Textarea } from '@flux/ui';
import { Button } from '@flux/ui';
import { Settings } from 'lucide-react';
import { useWhatsAppSession } from './use-whatsapp-session';
import { WaSessionDialog } from './wa-session-dialog';
import { FieldGroup } from '../../ui/components/node-config-panel';
import { Switch } from '@flux/ui';
import { Label } from '@flux/ui';

export function WhatsAppConfigFields({ config, update }: {
    config: Record<string, any>;
    update: (key: string, value: any) => void;
}) {
    const action = config.action || 'send_message';
    const sessionId = config.sessionId || 'default';
    const sendToGroup = config.sendToGroup || false;

    const wa = useWhatsAppSession();
    const [contactSearch, setContactSearch] = useState('');
    const [showContactList, setShowContactList] = useState(false);

    // Load contacts when session changes and is connected
    useEffect(() => {
        const session = wa.sessions.find(s => s.id === sessionId);
        if (session?.connected) {
            if (!wa.contacts[sessionId]) wa.fetchContacts(sessionId);
            if (!wa.groups[sessionId]) wa.fetchGroups(sessionId);
        }
    }, [sessionId, wa.sessions]);

    const sessionContacts = wa.contacts[sessionId] || [];
    const filteredContacts = useMemo(() => {
        if (!contactSearch) return sessionContacts.slice(0, 50);
        const q = contactSearch.toLowerCase();
        return sessionContacts.filter(c =>
            c.name.toLowerCase().includes(q) || c.phone.includes(q)
        ).slice(0, 50);
    }, [sessionContacts, contactSearch]);

    const sessionGroups = wa.groups[sessionId] || [];

    const currentSession = wa.sessions.find(s => s.id === sessionId);
    const isConnected = currentSession?.connected ?? false;

    return (
        <div className="flex flex-col gap-3">
            {/* ── Session Selector ── */}
            <FieldGroup label="Sesión WhatsApp">
                <div className="flex gap-1.5">
                    <Select value={sessionId} onValueChange={(v) => update('sessionId', v)}>
                        <SelectTrigger className="h-8 text-xs flex-1 font-mono">
                            <SelectValue placeholder="Seleccionar sesión" />
                        </SelectTrigger>
                        <SelectContent>
                            {wa.sessions.length === 0 ? (
                                <SelectItem value="default" className="text-xs">default</SelectItem>
                            ) : (
                                wa.sessions.map(s => (
                                    <SelectItem key={s.id} value={s.id} className="text-xs">
                                        <span className="flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                                                s.connected ? 'bg-green-500' : 'bg-yellow-500/60'
                                            }`} />
                                            {s.id}
                                        </span>
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>

                    <WaSessionDialog
                        sessions={wa.sessions}
                        loading={wa.loading}
                        error={wa.error}
                        qrUrl={wa.qrUrl}
                        linkingSessionId={wa.linkingSessionId}
                        onStartSession={wa.startSession}
                        onStopSession={wa.stopSession}
                        onDeleteSession={wa.deleteSession}
                        onRefresh={wa.refreshSessions}
                        onSetLinking={wa.setLinkingSessionId}
                        trigger={
                            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" title="Gestionar sesiones">
                                <Settings className="w-3.5 h-3.5" />
                            </Button>
                        }
                    />
                </div>

                {/* Status badge */}
                {isConnected ? (
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]" />
                        <span className="text-[10px] text-green-400">Conectado</span>
                        {currentSession?.jid && (
                            <span className="text-[10px] text-muted-foreground font-mono ml-1">
                                {currentSession.jid}
                            </span>
                        )}
                    </div>
                ) : (
                    <p className="text-[10px] text-yellow-500 mt-1">
                        Sesión no conectada — abre ⚙️ para vincular con QR
                    </p>
                )}
            </FieldGroup>

            <Separator />

            {/* ── Action ── */}
            <FieldGroup label="Acción">
                <Select value={action} onValueChange={(v) => update('action', v)}>
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="send_message" className="text-xs">Enviar Mensaje</SelectItem>
                        <SelectItem value="send_media" className="text-xs">Enviar Media</SelectItem>
                        <SelectItem value="get_chats" className="text-xs">Obtener Chats</SelectItem>
                        <SelectItem value="get_messages" className="text-xs">Leer Mensajes</SelectItem>
                        <SelectItem value="get_contacts" className="text-xs">Contactos</SelectItem>
                        <SelectItem value="get_group_info" className="text-xs">Info del Grupo</SelectItem>
                        <SelectItem value="get_profile_picture" className="text-xs">Foto de Perfil</SelectItem>
                    </SelectContent>
                </Select>
            </FieldGroup>

            {/* ── Target Selection ── */}
            {['send_message', 'send_media'].includes(action) && (
                <div className="flex items-center gap-2 mb-1">
                    <Switch
                        checked={sendToGroup}
                        onCheckedChange={(v) => update('sendToGroup', v)}
                    />
                    <Label className="text-xs font-medium">Enviar a Grupo</Label>
                </div>
            )}

            {['send_message', 'send_media'].includes(action) && sendToGroup && (
                <FieldGroup label="Grupo Destino">
                    <Select value={config.groupId || ''} onValueChange={(v) => update('groupId', v)}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Seleccionar grupo..." />
                        </SelectTrigger>
                        <SelectContent>
                            {sessionGroups.length === 0 ? (
                                <SelectItem value="none" disabled className="text-xs">No hay grupos disponibles</SelectItem>
                            ) : (
                                sessionGroups.map(g => (
                                    <SelectItem key={g.jid} value={g.jid} className="text-xs">{g.name}</SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                        {isConnected ? `${sessionGroups.length} grupos cargados.` : ''}
                    </p>
                </FieldGroup>
            )}

            {((['send_message', 'send_media'].includes(action) && !sendToGroup) || action === 'get_profile_picture') && (
                <FieldGroup label="Número de Teléfono">
                    <div className="relative">
                        <Input
                            value={config.phoneNumber || ''}
                            onChange={(e) => {
                                update('phoneNumber', e.target.value);
                                setContactSearch(e.target.value);
                            }}
                            onFocus={() => setShowContactList(true)}
                            onBlur={() => setTimeout(() => setShowContactList(false), 200)}
                            placeholder={isConnected ? "Buscar contacto o escribir número..." : "+573001234567"}
                            className="h-8 text-xs"
                        />

                        {/* Contact dropdown */}
                        {showContactList && isConnected && filteredContacts.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-lg max-h-[180px] overflow-y-auto">
                                {filteredContacts.map(contact => (
                                    <button
                                        key={contact.jid}
                                        type="button"
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/80 text-left transition-colors"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            update('phoneNumber', contact.phone);
                                            setContactSearch('');
                                            setShowContactList(false);
                                        }}
                                    >
                                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                                            <span className="text-[10px] text-green-400 font-bold">
                                                {contact.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs truncate">{contact.name}</div>
                                            <div className="text-[10px] text-muted-foreground font-mono">{contact.phone}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                        {isConnected
                            ? `${sessionContacts.length} contactos disponibles. También soporta interpolación: {{nodo.data.phone}}`
                            : 'Soporta interpolación: {{nodo.data.body.phone}}'
                        }
                    </p>
                </FieldGroup>
            )}

            {/* ── Message ── */}
            {action === 'send_message' && (
                <FieldGroup label="Mensaje">
                    <Textarea
                        value={config.message || ''}
                        onChange={(e) => update('message', e.target.value)}
                        placeholder={"{{global.timeEmoji}} Hola {{http1.data.body.user}}"}
                        className="text-xs min-h-[80px]"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                        Usa {'{{ }}'} para inyectar datos de nodos previos o variables globales.
                    </p>
                </FieldGroup>
            )}

            {/* ── Media ── */}
            {action === 'send_media' && (
                <>
                    <FieldGroup label="Ruta del Archivo">
                        <Input
                            value={config.mediaPath || ''}
                            onChange={(e) => update('mediaPath', e.target.value)}
                            placeholder="/ruta/al/archivo.pdf"
                            className="h-8 text-xs"
                        />
                    </FieldGroup>
                    <FieldGroup label="Caption">
                        <Input
                            value={config.mediaCaption || ''}
                            onChange={(e) => update('mediaCaption', e.target.value)}
                            placeholder="Documento adjunto"
                            className="h-8 text-xs"
                        />
                    </FieldGroup>
                </>
            )}

            {/* ── Chat ID ── */}
            {action === 'get_messages' && (
                <FieldGroup label="Chat ID">
                    <Input
                        value={config.chatId || ''}
                        onChange={(e) => update('chatId', e.target.value)}
                        placeholder={isConnected ? "Seleccionar de contactos arriba o escribir JID" : "ID del chat"}
                        className="h-8 text-xs font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                        Formato: <code>573001234567@s.whatsapp.net</code>
                    </p>
                </FieldGroup>
            )}

            {/* ── Group ID ── */}
            {action === 'get_group_info' && (
                <FieldGroup label="Group ID">
                    <Input
                        value={config.groupId || ''}
                        onChange={(e) => update('groupId', e.target.value)}
                        placeholder="ID del grupo"
                        className="h-8 text-xs"
                    />
                </FieldGroup>
            )}

            {/* ── Limit ── */}
            {['get_messages', 'get_chats'].includes(action) && (
                <FieldGroup label="Límite de resultados">
                    <Input
                        type="number"
                        value={config.messageLimit || 50}
                        onChange={(e) => update('messageLimit', parseInt(e.target.value) || 50)}
                        className="h-8 text-xs"
                        min={1}
                    />
                </FieldGroup>
            )}
        </div>
    );
}
