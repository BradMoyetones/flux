"use client"

import type { WaSessionConfig, WorkspaceConfig } from "@/modules/settings/lib/settings-types"
import { Badge, SectionCard, Select, Switch } from "@/modules/settings/ui/components/controls"
import { cn } from "@/shared/utils/utils"
import { Button } from "@/ui/components/ui/button"
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

export function WhatsAppSection({
    sessions,
    workspaces,
    onUpdate,
    onDelete,
}: {
    sessions: WaSessionConfig[]
    workspaces: WorkspaceConfig[]
    onUpdate: (id: string, patch: Partial<WaSessionConfig>) => void
    onDelete: (id: string) => void
}) {
    const connected = sessions.filter((s) => s.connected).length
    const allNodes = workspaces.flatMap((ws) =>
        ws.workflows.flatMap((wf) =>
            wf.nodes
                .filter((n) => n.type === "whatsapp")
                .map((n) => ({ value: `${wf.id}:${n.id}`, label: `${wf.name} · ${n.label}` })),
        ),
    )

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
                    <Plug className="size-3.5" />
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
                                        <h3 className="text-sm font-semibold text-foreground">{s.label}</h3>
                                        <Badge tone={s.connected ? "success" : "neutral"}>
                                            {s.connected ? "Conectada" : "Desconectada"}
                                        </Badge>
                                        {s.reusable && <Badge tone="primary">Reutilizable</Badge>}
                                    </div>
                                    <p className="font-mono text-[11px] text-muted-foreground">
                                        {s.id} · :{s.port}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {s.phone ?? "Sin vincular"} · {s.lastActivity ?? "sin actividad"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                                {s.connected ? (
                                    <Button variant="outline" size="sm" onClick={() => onUpdate(s.id, { connected: false })}>
                                        <Power className="size-3.5" />
                                        Detener
                                    </Button>
                                ) : (
                                    <Button variant="outline" size="sm" onClick={() => onUpdate(s.id, { connected: true })}>
                                        <QrCode className="size-3.5" />
                                        Vincular
                                    </Button>
                                )}
                                <Button variant="destructive" size="icon-sm" aria-label="Eliminar sesión" onClick={() => onDelete(s.id)}>
                                    <Trash2 className="size-3.5" />
                                </Button>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
                            <MiniStat icon={Send} label="Enviados" value={s.messagesSent.toLocaleString("es")} />
                            <MiniStat icon={Users} label="Contactos" value={String(s.contactsCount)} />
                            <MiniStat icon={MessagesSquare} label="Chats" value={String(s.chatsCount)} />
                        </div>

                        {/* Reciclaje / binding */}
                        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Switch checked={s.reusable} onCheckedChange={(v) => onUpdate(s.id, { reusable: v })} />
                                Reciclar conexión entre nodos
                            </label>
                            <div className="ml-auto flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Nodo asignado</span>
                                <div className="w-56">
                                    <Select
                                        value={s.boundWorkflowId ? `${s.boundWorkflowId}:${s.boundNodeId}` : ""}
                                        onChange={(e) => {
                                            const [wf, node] = e.target.value.split(":")
                                            onUpdate(s.id, { boundWorkflowId: wf || null, boundNodeId: node || null })
                                        }}
                                    >
                                        <option value="">Sin asignar</option>
                                        {allNodes.map((n) => (
                                            <option key={n.value} value={n.value}>
                                                {n.label}
                                            </option>
                                        ))}
                                    </Select>
                                </div>
                            </div>
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
