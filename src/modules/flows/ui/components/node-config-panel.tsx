import type { AppNode } from '../../core/use-flow-store';
import { getPluginDefinition } from '../../plugins/registry';
import { Input } from '@/ui/components/ui/input';
import { Button } from '@/ui/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/components/ui/select';
import { Separator } from '@/ui/components/ui/separator';
import { Switch } from '@/ui/components/ui/switch';
import { Textarea } from '@/ui/components/ui/textarea';
import { Label } from '@/ui/components/ui/label';
import { Badge } from '@/ui/components/ui/badge';
import { ScrollArea } from '@/ui/components/ui/scroll-area';
import { X, Settings2, Globe, MessageSquare, Puzzle, Settings, type LucideIcon } from 'lucide-react';
import { KeyValueBuilder } from './key-value-builder';
import { useWhatsAppSession } from '../../plugins/whatsapp/use-whatsapp-session';
import { WaSessionDialog } from '../../plugins/whatsapp/wa-session-dialog';
import { useState, useEffect, useMemo } from 'react';

const ICON_MAP: Record<string, LucideIcon> = {
    Globe,
    MessageSquare,
    Puzzle,
};

interface NodeConfigPanelProps {
    node?: AppNode;
    onClose: () => void;
    onUpdateConfig: (nodeId: string, config: Record<string, any>) => void;
    onUpdateLabel: (nodeId: string, label: string) => void;
    onUpdateName: (nodeId: string, name: string) => void;
}

export function NodeConfigPanel({ node, onClose, onUpdateConfig, onUpdateLabel, onUpdateName }: NodeConfigPanelProps) {
    if (!node) return null;

    const plugin = getPluginDefinition(node.type || '');
    const Icon = ICON_MAP[plugin?.icon || ''] || Settings2;

    return (
        <div className="absolute right-0 top-0 h-full w-[340px] border-l bg-card z-50 shadow-xl flex flex-col animate-in slide-in-from-right-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: plugin?.color }} />
                    <h3 className="text-sm font-semibold">{plugin?.label || node.type}</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1 overflow-y-auto">
                <div className="p-4 flex flex-col gap-4">
                    {/* Label */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Etiqueta visual</Label>
                        <Input
                            value={node.data.label || ''}
                            onChange={(e) => onUpdateLabel(node.id, e.target.value)}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <Label className="text-xs font-medium text-muted-foreground">ID del Nodo</Label>
                            <Badge variant="outline" className="text-[9px] font-mono font-normal">{'{{' + (node.data.name || node.id) + '.data}}'}</Badge>
                        </div>
                        <Input
                            value={node.data.name || ''}
                            onChange={(e) => onUpdateName(node.id, e.target.value)}
                            className="h-8 text-sm font-mono"
                            placeholder="ej: mi_nodo"
                        />
                        <p className="text-[10px] text-muted-foreground">Úsalo para interpolar variables en otros nodos.</p>
                    </div>

                    <Separator />

                    {/* Config fields dinámicos por tipo */}
                    <ConfigFields
                        key={node.id}
                        nodeType={node.type || ''}
                        config={node.data.config}
                        onChange={(config) => onUpdateConfig(node.id, config)}
                    />
                </div>
            </ScrollArea>

            {/* Footer info */}
            <div className="border-t px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="font-mono">{node.id.slice(0, 8)}</span>
                <Badge variant="outline" className="text-[10px]">{node.type}</Badge>
            </div>
        </div>
    );
}

// ──── Config Fields por Plugin ────

interface ConfigFieldsProps {
    nodeType: string;
    config: Record<string, any>;
    onChange: (config: Record<string, any>) => void;
}

function ConfigFields({ nodeType, config, onChange }: ConfigFieldsProps) {
    const update = (key: string, value: any) => onChange({ ...config, [key]: value });

    switch (nodeType) {
        case 'http':
            return <HttpConfigFields config={config} update={update} onChange={onChange} />;
        case 'whatsapp':
            return <WhatsAppConfigFields config={config} update={update} onChange={onChange} />;
        default:
            return (
                <div className="text-xs text-muted-foreground italic">
                    No hay configuración disponible para este tipo de nodo.
                </div>
            );
    }
}

// ──── HTTP Fields ────

function HttpConfigFields({ config, update, onChange: _onChange }: {
    config: Record<string, any>;
    update: (key: string, value: any) => void;
    onChange: (config: Record<string, any>) => void;
}) {
    const isFormUrlEncoded = config.contentType === 'application/x-www-form-urlencoded';
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(config.method);

    return (
        <div className="flex flex-col gap-3">
            <FieldGroup label="Basics">
                <div className="flex gap-2">
                    <div className="w-28">
                        <Select value={config.method || 'GET'} onValueChange={(v) => update('method', v)}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(m => (
                                    <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Input
                        value={config.url || ''}
                        onChange={(e) => update('url', e.target.value)}
                        placeholder="https://api.example.com/endpoint"
                        className="h-8 text-xs flex-1"
                    />
                </div>
            </FieldGroup>

            <FieldGroup label="Content-Type">
                <Select value={config.contentType || 'application/json'} onValueChange={(v) => update('contentType', v)}>
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {['application/json', 'application/x-www-form-urlencoded', 'text/plain', 'text/xml', 'multipart/form-data'].map(ct => (
                            <SelectItem key={ct} value={ct} className="text-xs">{ct}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FieldGroup>

            {/* Body: KeyValueBuilder para form-urlencoded, Textarea para el resto */}
            {hasBody && (
                isFormUrlEncoded ? (
                    <FieldGroup label="Body (Form URL-Encoded)">
                        <KeyValueBuilder
                            value={config.bodyParams || {}}
                            onChange={(v) => update('bodyParams', v)}
                            keyPlaceholder="Campo"
                            valuePlaceholder="Valor (soporta {{interpolación}})"
                        />
                    </FieldGroup>
                ) : (
                    <FieldGroup label="Body">
                        <Textarea
                            value={config.body || ''}
                            onChange={(e) => update('body', e.target.value)}
                            placeholder='{"key": "value"}'
                            className="text-xs font-mono min-h-[80px]"
                        />
                    </FieldGroup>
                )
            )}

            <Separator />

            {/* Headers con KeyValueBuilder */}
            <FieldGroup label="Headers">
                <KeyValueBuilder
                    value={config.headers || {}}
                    onChange={(v) => update('headers', v)}
                    keyPlaceholder="Header"
                    valuePlaceholder="Valor (soporta {{interpolación}})"
                />
            </FieldGroup>

            {/* Query Params con KeyValueBuilder */}
            <FieldGroup label="Query Params">
                <KeyValueBuilder
                    value={config.queryParams || {}}
                    onChange={(v) => update('queryParams', v)}
                    keyPlaceholder="Param"
                    valuePlaceholder="Value"
                />
            </FieldGroup>

            <Separator />

            {/* Raw Cookies */}
            <FieldGroup label="Cookies (Raw)">
                <Input
                    value={config.rawCookies || ''}
                    onChange={(e) => update('rawCookies', e.target.value)}
                    placeholder="PHPSESSID={{node1.data.cookies.PHPSESSID}}"
                    className="h-8 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                    Inyecta cookies de nodos previos con {'{{nodeId.data.cookies.nombre}}'}
                </p>
            </FieldGroup>

            <FieldGroup label="Response Type">
                <Select value={config.responseType || 'auto'} onValueChange={(v) => update('responseType', v)}>
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {['auto', 'json', 'text', 'binary'].map(rt => (
                            <SelectItem key={rt} value={rt} className="text-xs capitalize">{rt}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FieldGroup>

            <Separator />

            <FieldGroup label="Comportamiento">
                <div className="flex flex-col gap-2">
                    <SwitchField
                        label="Seguir Redirects"
                        checked={config.followRedirects !== false}
                        onChange={(v) => update('followRedirects', v)}
                    />
                    <SwitchField
                        label="Ignorar errores SSL"
                        checked={config.ignoreSslErrors === true}
                        onChange={(v) => update('ignoreSslErrors', v)}
                    />
                    <SwitchField
                        label="Persistir Cookies"
                        checked={config.persistCookies === true}
                        onChange={(v) => update('persistCookies', v)}
                    />
                </div>
            </FieldGroup>

            <FieldGroup label="Timeout (ms)">
                <Input
                    type="number"
                    value={config.timeoutMs || 30000}
                    onChange={(e) => update('timeoutMs', parseInt(e.target.value) || 30000)}
                    className="h-8 text-xs"
                />
            </FieldGroup>

            <FieldGroup label="Retry">
                <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Intentos</Label>
                        <Input
                            type="number"
                            value={config.retryCount || 0}
                            onChange={(e) => update('retryCount', parseInt(e.target.value) || 0)}
                            className="h-8 text-xs"
                            min={0}
                        />
                    </div>
                    <div className="flex-1 space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Delay (ms)</Label>
                        <Input
                            type="number"
                            value={config.retryDelayMs || 1000}
                            onChange={(e) => update('retryDelayMs', parseInt(e.target.value) || 1000)}
                            className="h-8 text-xs"
                            min={0}
                        />
                    </div>
                </div>
            </FieldGroup>
        </div>
    );
}

// ──── WhatsApp Fields ────

function WhatsAppConfigFields({ config, update }: {
    config: Record<string, any>;
    update: (key: string, value: any) => void;
    onChange: (config: Record<string, any>) => void;
}) {
    const action = config.action || 'send_message';
    const sessionId = config.sessionId || 'default';

    const wa = useWhatsAppSession();
    const [contactSearch, setContactSearch] = useState('');
    const [showContactList, setShowContactList] = useState(false);

    // Load contacts when session changes and is connected
    useEffect(() => {
        const session = wa.sessions.find(s => s.id === sessionId);
        if (session?.connected && !wa.contacts[sessionId]) {
            wa.fetchContacts(sessionId);
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

            {/* ── Phone Number with Contact Picker ── */}
            {['send_message', 'send_media', 'get_profile_picture'].includes(action) && (
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

// ──── Shared UI atoms ────

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
            {children}
        </div>
    );
}

function SwitchField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between">
            <Label className="text-xs">{label}</Label>
            <Switch checked={checked} onCheckedChange={onChange} />
        </div>
    );
}
