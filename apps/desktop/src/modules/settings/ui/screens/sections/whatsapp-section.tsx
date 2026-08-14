"use client"

import { useWhatsAppSession } from "@/modules/flows/plugins/whatsapp/use-whatsapp-session"
import { Badge, SectionCard } from "@/modules/settings/ui/components/controls"
import { cn } from "@/shared/utils/utils"
import { Button } from "@/ui/components/ui/button"
import { Switch } from "@/ui/components/ui/switch"
import {
    MessageCircle,
    Plug,
    Power,
    QrCode,
    Trash2,
    Users,
    MessagesSquare,
    Send,
} from "lucide-react"

export function WhatsAppSection() {
    const {sessions, startSession, stopSession, deleteSession} = useWhatsAppSession()
    const connected = sessions.filter((s) => s.connected).length

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                        <MessageCircle className="size-4.5" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">Sesiones de WhatsApp</p>
                        <p className="text-xs text-muted-foreground">
                            {connected} de {sessions.length} conectadas · sidecar en Go
                        </p>
                    </div>
                </div>
                <Button size="sm">
                    <Plug />
                    Nueva sesión
                </Button>
            </div>

            <div className="space-y-3">
                {sessions.map((s) => (
                    <article key={s.id} className="rounded-xl border border-border bg-card p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <span
                                    className={cn(
                                        "mt-1 flex size-2.5 shrink-0 rounded-full",
                                        s.connected ? "bg-emerald-500" : "bg-muted-foreground/40",
                                    )}
                                    aria-hidden
                                />
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-foreground">{s.id ?? "Sin vincular"}</h3>
                                        <Badge tone={s.connected ? "success" : "neutral"}>
                                            {s.connected ? "Conectada" : "Desconectada"}
                                        </Badge>
                                        <Badge tone="primary">Reutilizable</Badge>
                                    </div>
                                    <p className="font-mono text-[11px] text-muted-foreground">
                                        {s.jid ?? "--"} · :{s.port}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {s.jid?.split(":")[0] ?? "--"} · {"sin actividad"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                                {s.connected ? (
                                    <Button variant="outline" size="sm" onClick={() => stopSession(s.id)}>
                                        <Power />
                                        Detener
                                    </Button>
                                ) : (
                                    <Button variant="outline" size="sm" onClick={() => startSession(s.id)}>
                                        <QrCode />
                                        Vincular
                                    </Button>
                                )}
                                <Button variant="destructive" size="icon-sm" aria-label="Eliminar sesión" onClick={() => deleteSession(s.id)}>
                                    <Trash2 />
                                </Button>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
                            <MiniStat icon={Send} label="Enviados" value={String(0)} />
                            <MiniStat icon={Users} label="Contactos" value={String(0)} />
                            <MiniStat icon={MessagesSquare} label="Chats" value={String(0)} />
                        </div>

                        {/* Reciclaje / binding */}
                        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Switch checked={true} disabled />
                                Reciclar conexión entre nodos
                            </label>
                        </div>
                    </article>
                ))}
            </div>

            <SectionCard title="Sidecar" description="Configuración del proceso Go que administra las sesiones.">
                <div className="grid gap-4 sm:grid-cols-2 text-sm">
                    <KeyVal k="Rango de puertos" v="8801 – 8899" />
                    <KeyVal k="Reconexión automática" v="Activada" />
                    <KeyVal k="Almacenamiento de credenciales" v="~/.flux/wa-sessions" />
                    <KeyVal k="Librería" v="whatsmeow (Go)" />
                </div>
            </SectionCard>
        </div>
    )
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Send; label: string; value: string }) {
    return (
        <div className="flex items-center gap-2">
            <Icon className="size-3.5 text-muted-foreground" />
            <div className="leading-tight">
                <p className="text-sm font-medium text-foreground">{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
        </div>
    )
}

function KeyVal({ k, v }: { k: string; v: string }) {
    return (
        <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
            <span className="text-xs text-muted-foreground">{k}</span>
            <span className="font-mono text-xs text-foreground">{v}</span>
        </div>
    )
}
