"use client"

import { useMemo, useState } from "react"
import type {
    NodeType,
    RunMode,
    WaSessionConfig,
    WorkflowConfig,
    WorkspaceConfig,
} from "@/modules/settings/lib/settings-types"
import {
    Badge,
    Field,
    SectionCard,
    SegmentedControl,
    SettingRow,
    Select,
    Switch,
    TextArea,
    TextInput,
} from "@/modules/settings/ui/components/controls"
import { Button } from "@/ui/components/ui/button"
import {
    ArrowRightLeft,
    Clock,
    FolderTree,
    Globe,
    MessageCircle,
    Play,
    Plus,
    Sparkles,
    Trash2,
    Workflow,
    Zap,
} from "lucide-react"
import { cn } from "@/shared/utils/utils"

const NODE_META: Record<NodeType, { icon: typeof Globe; label: string }> = {
    http: { icon: Globe, label: "HTTP" },
    whatsapp: { icon: MessageCircle, label: "WhatsApp" },
    transform: { icon: ArrowRightLeft, label: "Transform" },
    trigger: { icon: Zap, label: "Trigger" },
    delay: { icon: Clock, label: "Delay" },
}

export function WorkspacesSection({
    workspaces,
    sessions,
    onUpdateWorkspace,
    onUpdateWorkflow,
    onDeleteWorkspace,
    onDeleteWorkflow,
}: {
    workspaces: WorkspaceConfig[]
    sessions: WaSessionConfig[]
    onUpdateWorkspace: (wsId: string, patch: Partial<WorkspaceConfig>) => void
    onUpdateWorkflow: (wsId: string, wfId: string, patch: Partial<WorkflowConfig>) => void
    onDeleteWorkspace: (wsId: string) => void
    onDeleteWorkflow: (wsId: string, wfId: string) => void
}) {
    const firstWs = workspaces[0]
    const [selWs, setSelWs] = useState<string | null>(firstWs?.id ?? null)
    const [selWf, setSelWf] = useState<string | null>(firstWs?.workflows[0]?.id ?? null)

    const workspace = useMemo(() => workspaces.find((w) => w.id === selWs) ?? null, [workspaces, selWs])
    const workflow = useMemo(
        () => workspace?.workflows.find((f) => f.id === selWf) ?? null,
        [workspace, selWf],
    )

    return (
        <div className="flex flex-col-reverse gap-4 lg:flex-row">
            {/* Panel de detalle */}
            <div className="min-w-0 flex-1 space-y-5">
                {workflow && workspace ? (
                    <WorkflowDetail
                        key={workflow.id}
                        workspace={workspace}
                        workflow={workflow}
                        sessions={sessions}
                        onUpdate={(patch) => onUpdateWorkflow(workspace.id, workflow.id, patch)}
                        onDelete={() => {
                            onDeleteWorkflow(workspace.id, workflow.id)
                            setSelWf(null)
                        }}
                    />
                ) : workspace ? (
                    <WorkspaceDetail
                        workspace={workspace}
                        onUpdate={(patch) => onUpdateWorkspace(workspace.id, patch)}
                        onDelete={() => {
                            onDeleteWorkspace(workspace.id)
                            setSelWs(null)
                        }}
                    />
                ) : (
                    <EmptyState />
                )}
            </div>

            {/* Rail derecho estilo Discord */}
            <aside className="w-full shrink-0 lg:w-64">
                <div className="rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Workspaces
                        </span>
                        <Button variant="ghost" size="icon-xs" aria-label="Nuevo workspace">
                            <Plus className="size-3.5" />
                        </Button>
                    </div>
                    <nav className="max-h-[540px] space-y-3 overflow-y-auto p-2">
                        {workspaces.map((ws) => (
                            <div key={ws.id}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelWs(ws.id)
                                        setSelWf(null)
                                    }}
                                    className={cn(
                                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                                        selWs === ws.id && !selWf
                                            ? "bg-muted text-foreground"
                                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                                    )}
                                >
                                    <span
                                        className="size-2.5 shrink-0 rounded-[4px]"
                                        style={{ backgroundColor: accentSwatch(ws.color) }}
                                    />
                                    <span className="truncate text-sm font-medium">{ws.name}</span>
                                    <span className="ml-auto text-[11px] text-muted-foreground">
                                        {ws.workflows.length}
                                    </span>
                                </button>
                                <div className="mt-0.5 ml-3 space-y-0.5 border-l border-border pl-2">
                                    {ws.workflows.map((wf) => (
                                        <button
                                            key={wf.id}
                                            type="button"
                                            onClick={() => {
                                                setSelWs(ws.id)
                                                setSelWf(wf.id)
                                            }}
                                            className={cn(
                                                "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[13px] transition-colors",
                                                selWf === wf.id
                                                    ? "bg-(--primary)/12 text-(--primary)"
                                                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                                            )}
                                        >
                                            <Workflow className="size-3.5 shrink-0" />
                                            <span className="truncate">{wf.name}</span>
                                            {!wf.enabled && (
                                                <span className="ml-auto size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>
                </div>
            </aside>
        </div>
    )
}

/* --------------------------- Workflow detail panel -------------------------- */

function WorkflowDetail({
    workspace,
    workflow,
    sessions,
    onUpdate,
    onDelete,
}: {
    workspace: WorkspaceConfig
    workflow: WorkflowConfig
    sessions: WaSessionConfig[]
    onUpdate: (patch: Partial<WorkflowConfig>) => void
    onDelete: () => void
}) {
    return (
        <>
            {/* Header */}
            <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div
                            className="mt-0.5 flex size-9 items-center justify-center rounded-lg text-white"
                            style={{ backgroundColor: accentSwatch(workflow.color) }}
                        >
                            <Workflow className="size-4.5" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-semibold text-foreground">{workflow.name}</h2>
                                {statusBadge(workflow)}
                            </div>
                            <p className="font-mono text-xs text-muted-foreground">{workflow.path}</p>
                            <p className="text-xs text-muted-foreground">
                                en <span className="text-foreground">{workspace.name}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                            <Play className="size-3.5" />
                            Ejecutar
                        </Button>
                        <Switch checked={workflow.enabled} onCheckedChange={(v) => onUpdate({ enabled: v })} />
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
                    <Stat label="Última ejecución" value={workflow.lastRun ?? "Nunca"} />
                    <Stat label="Ejecuciones (7d)" value={String(workflow.runsThisWeek)} />
                    <Stat label="Nodos" value={String(workflow.nodes.length)} />
                </div>
            </div>

            <SectionCard title="General">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nombre" className="sm:col-span-2">
                        <TextInput value={workflow.name} onChange={(e) => onUpdate({ name: e.target.value })} />
                    </Field>
                    <Field label="Descripción" className="sm:col-span-2">
                        <TextArea value={workflow.description} onChange={(e) => onUpdate({ description: e.target.value })} />
                    </Field>
                </div>
            </SectionCard>

            <SectionCard title="Ejecución" description="Cómo y cuándo corre este flujo.">
                <div className="space-y-4">
                    <Field label="Modo de ejecución">
                        <SegmentedControl<RunMode>
                            value={workflow.runMode}
                            onChange={(v) => onUpdate({ runMode: v })}
                            options={[
                                { value: "manual", label: "Manual" },
                                { value: "scheduled", label: "Programado" },
                                { value: "auto", label: "Automático" },
                            ]}
                        />
                    </Field>

                    {workflow.runMode === "scheduled" && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Expresión CRON" hint="Formato estándar. Ej: 0 18 * * *">
                                <TextInput
                                    className="font-mono"
                                    value={workflow.cron}
                                    placeholder="0 18 * * *"
                                    onChange={(e) => onUpdate({ cron: e.target.value })}
                                />
                            </Field>
                            <Field label="Zona horaria">
                                <Select value={workflow.timezone} onChange={(e) => onUpdate({ timezone: e.target.value })}>
                                    <option value="America/Bogota">America/Bogota</option>
                                    <option value="America/Mexico_City">America/Mexico_City</option>
                                    <option value="America/New_York">America/New_York</option>
                                    <option value="UTC">UTC</option>
                                </Select>
                            </Field>
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Concurrencia" hint="Ejecuciones simultáneas máximas.">
                            <TextInput
                                type="number"
                                min={1}
                                value={workflow.concurrency}
                                onChange={(e) => onUpdate({ concurrency: Number(e.target.value) })}
                            />
                        </Field>
                        <Field label="Timeout (segundos)">
                            <TextInput
                                type="number"
                                min={1}
                                value={workflow.timeoutSec}
                                onChange={(e) => onUpdate({ timeoutSec: Number(e.target.value) })}
                            />
                        </Field>
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="Reintentos y registro">
                <div className="divide-y divide-border">
                    <SettingRow title="Reintentar si falla" description="Vuelve a intentar la ejecución completa ante un error.">
                        <Switch checked={workflow.retryOnFail} onCheckedChange={(v) => onUpdate({ retryOnFail: v })} />
                    </SettingRow>
                    {workflow.retryOnFail && (
                        <SettingRow title="Máximo de reintentos">
                            <div className="w-24">
                                <TextInput
                                    type="number"
                                    min={0}
                                    value={workflow.maxRetries}
                                    onChange={(e) => onUpdate({ maxRetries: Number(e.target.value) })}
                                />
                            </div>
                        </SettingRow>
                    )}
                    <SettingRow title="Guardar log de ejecución" description="Almacena la salida de cada nodo para depurar.">
                        <Switch checked={workflow.saveExecutionLog} onCheckedChange={(v) => onUpdate({ saveExecutionLog: v })} />
                    </SettingRow>
                    <SettingRow title="Notificar en error" description="Envía una notificación de escritorio si el flujo falla.">
                        <Switch checked={workflow.notifyOnError} onCheckedChange={(v) => onUpdate({ notifyOnError: v })} />
                    </SettingRow>
                </div>
            </SectionCard>

            <SectionCard title="Nodos" description={`${workflow.nodes.length} nodos en este flujo.`}>
                <ul className="space-y-1.5">
                    {workflow.nodes.map((node, i) => {
                        const meta = NODE_META[node.type]
                        const Icon = meta.icon
                        const boundSession =
                            node.type === "whatsapp"
                                ? sessions.find((s) => s.boundWorkflowId === workflow.id && s.boundNodeId === node.id)
                                : undefined
                        return (
                            <li
                                key={node.id}
                                className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
                            >
                                <span className="flex size-4 items-center justify-center text-[11px] font-medium text-muted-foreground">
                                    {i + 1}
                                </span>
                                <span className="flex size-7 items-center justify-center rounded-md bg-muted text-foreground">
                                    <Icon className="size-3.5" />
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-foreground">{node.label}</p>
                                    <p className="font-mono text-[11px] text-muted-foreground">{node.name}</p>
                                </div>
                                <div className="ml-auto flex items-center gap-1.5">
                                    {boundSession && (
                                        <Badge tone={boundSession.connected ? "success" : "neutral"}>
                                            {boundSession.label}
                                        </Badge>
                                    )}
                                    <Badge tone="neutral">{meta.label}</Badge>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </SectionCard>

            <DangerZone
                title="Eliminar flujo"
                description="Se borrará el archivo de definición de este flujo. No se puede deshacer."
                buttonLabel="Eliminar flujo"
                onDelete={onDelete}
            />
        </>
    )
}

/* --------------------------- Workspace detail panel ------------------------- */

function WorkspaceDetail({
    workspace,
    onUpdate,
    onDelete,
}: {
    workspace: WorkspaceConfig
    onUpdate: (patch: Partial<WorkspaceConfig>) => void
    onDelete: () => void
}) {
    return (
        <>
            <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                    <div
                        className="flex size-9 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: accentSwatch(workspace.color) }}
                    >
                        <FolderTree className="size-4.5" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-foreground">{workspace.name}</h2>
                        <p className="text-xs text-muted-foreground">{workspace.workflows.length} flujos</p>
                    </div>
                </div>
            </div>

            <SectionCard title="General">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nombre">
                        <TextInput value={workspace.name} onChange={(e) => onUpdate({ name: e.target.value })} />
                    </Field>
                    <Field label="Slug" hint="Identificador en rutas y archivos.">
                        <TextInput className="font-mono" value={workspace.slug} onChange={(e) => onUpdate({ slug: e.target.value })} />
                    </Field>
                    <Field label="Descripción" className="sm:col-span-2">
                        <TextArea value={workspace.description} onChange={(e) => onUpdate({ description: e.target.value })} />
                    </Field>
                </div>
            </SectionCard>

            <DangerZone
                title="Eliminar workspace"
                description={`Se eliminará "${workspace.name}" y todos sus ${workspace.workflows.length} flujos.`}
                buttonLabel="Eliminar workspace"
                onDelete={onDelete}
            />
        </>
    )
}

/* --------------------------------- Helpers --------------------------------- */

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="space-y-0.5">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className="truncate text-sm font-medium text-foreground">{value}</p>
        </div>
    )
}

function DangerZone({
    title,
    description,
    buttonLabel,
    onDelete,
}: {
    title: string
    description: string
    buttonLabel: string
    onDelete: () => void
}) {
    return (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                </div>
                <Button variant="destructive" size="sm" onClick={onDelete}>
                    <Trash2 className="size-3.5" />
                    {buttonLabel}
                </Button>
            </div>
        </section>
    )
}

function EmptyState() {
    return (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
            <Sparkles className="size-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium text-foreground">Selecciona un flujo</p>
            <p className="text-xs text-muted-foreground">Elige un workspace o flujo del panel derecho.</p>
        </div>
    )
}

function statusBadge(wf: WorkflowConfig) {
    if (!wf.enabled) return <Badge tone="neutral">Pausado</Badge>
    if (wf.lastStatus === "error") return <Badge tone="danger">Error</Badge>
    if (wf.lastStatus === "ok") return <Badge tone="success">Activo</Badge>
    return <Badge tone="neutral">Sin correr</Badge>
}

function accentSwatch(c: string) {
    const map: Record<string, string> = {
        violet: "oklch(0.55 0.22 285)",
        blue: "oklch(0.55 0.18 250)",
        emerald: "oklch(0.6 0.15 160)",
        amber: "oklch(0.68 0.16 65)",
        rose: "oklch(0.62 0.2 15)",
    }
    return map[c] ?? map.violet
}
