"use client"

import { useEffect, useMemo, useState } from "react"
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
    FolderTree,
    MessageCircle,
    Play,
    Plus,
    Sparkles,
    Trash2,
    Workflow,
} from "lucide-react"
import { cn } from "@/shared/utils/utils"
import { useHomeStore } from "@/modules/home/stores/home-store"
import { FluxEntry, Workspace } from "@/types/data"
import { useWhatsAppSession, WhatsAppSessionInfo } from "@/modules/flows/plugins/whatsapp/use-whatsapp-session"
import { workspaceName } from "@/modules/home/lib/format"

export function WorkspacesSection() {
    const {sessions} = useWhatsAppSession()
    const {workspaces, workflows, loadData} = useHomeStore()
    const firstWs = workspaces[0] // Esto puede no existir
    const firstWf = workflows.find(wf => wf.workspace === firstWs)
    const [selWs, setSelWs] = useState<Workspace | null>(firstWs ?? null)
    const [selWf, setSelWf] = useState<FluxEntry | null>(firstWf ?? null)

    const workspace = useMemo(() => workspaces.find((w) => w === selWs) ?? null, [workspaces, selWs])
    const workflow = useMemo(
        () => workflows.find((f) => f === selWf) ?? null,
        [workflows, selWf],
    )

    useEffect(() => {
        loadData();
    }, []);

    return (
        <div className="flex flex-col-reverse gap-4 lg:flex-row">
            {/* Panel de detalle */}
            <div className="min-w-0 flex-1 space-y-5">
                {workflow && workspace ? (
                    <WorkflowDetail
                        workspace={workspace}
                        workflow={workflow}
                        sessions={sessions}
                    />
                ) : workspace ? (
                    <WorkspaceDetail />
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
                            <div key={ws}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelWs(ws)
                                        setSelWf(null)
                                    }}
                                    className={cn(
                                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                                        selWs === ws && !selWf
                                            ? "bg-muted text-foreground"
                                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                                    )}
                                >
                                    <span
                                        className="size-2.5 shrink-0 rounded-[4px]"
                                    />
                                    <span className="truncate text-sm font-medium">{workspaceName(ws)}</span>
                                    <span className="ml-auto text-[11px] text-muted-foreground">
                                        {workflows.filter((wf) => wf.workspace === ws).length}
                                    </span>
                                </button>
                                <div className="mt-0.5 ml-3 space-y-0.5 border-l border-border pl-2">
                                    {workflows.filter((wf) => wf.workspace === ws).map((wf) => (
                                        <button
                                            key={wf.path}
                                            type="button"
                                            onClick={() => {
                                                setSelWs(ws)
                                                setSelWf(wf)
                                            }}
                                            className={cn(
                                                "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[13px] transition-colors",
                                                selWf === wf
                                                    ? "bg-(--primary)/12 text-(--primary)"
                                                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                                            )}
                                        >
                                            <Workflow className="size-3.5 shrink-0" />
                                            <span className="truncate">{wf.name}</span>
                                            <span className="ml-auto size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
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
    workspace: _workspace,
    workflow,
    sessions: _sessions,
}: {
    workspace: Workspace
    workflow: FluxEntry
    sessions: WhatsAppSessionInfo[]
}) {
    return (
        <>
            {/* Header */}
            <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div
                            className="mt-0.5 flex size-9 items-center justify-center rounded-lg text-white"
                        >
                            <Workflow className="size-4.5" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-semibold text-foreground">{"Hola"}</h2>
                            </div>
                            <p className="font-mono text-xs text-muted-foreground">{"Hola"}</p>
                            <p className="text-xs text-muted-foreground">
                                en <span className="text-foreground">{"Hola"}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                            <Play className="size-3.5" />
                            Ejecutar
                        </Button>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
                    <Stat label="Última ejecución" value={"Nunca"} />
                    <Stat label="Ejecuciones (7d)" value={"0"} />
                    <Stat label="Nodos" value={"0"} />
                </div>
            </div>

            <SectionCard title="General">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nombre" className="sm:col-span-2">
                        <TextInput value={workflow.name} onChange={() => {}} />
                    </Field>
                    <Field label="Descripción" className="sm:col-span-2">
                        <TextArea value={""} onChange={() => {}} />
                    </Field>
                </div>
            </SectionCard>

            <SectionCard title="Ejecución" description="Cómo y cuándo corre este flujo.">
                <div className="space-y-4">
                    <Field label="Modo de ejecución">
                        <SegmentedControl<"manual" | "cron" | "webhook">
                            value={"manual"}
                            onChange={() => {}}
                            options={[
                                { value: "manual", label: "Manual" },
                                { value: "cron", label: "Programado (Cron)" },
                                { value: "webhook", label: "Webhook" },
                            ]}
                        />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Expresión CRON" hint="Formato estándar. Ej: 0 18 * * *">
                            <TextInput
                                className="font-mono"
                                value={"0 18 * * *"}
                                placeholder="0 18 * * *"
                                onChange={() => {}}
                            />
                        </Field>
                        <Field label="Zona horaria">
                            <Select value={"America/Bogota"} onChange={() => {}}>
                                <option value="America/Bogota">America/Bogota</option>
                                <option value="America/Mexico_City">America/Mexico_City</option>
                                <option value="America/New_York">America/New_York</option>
                                <option value="UTC">UTC</option>
                            </Select>
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Concurrencia" hint="Ejecuciones simultáneas máximas.">
                            <TextInput
                                type="number"
                                min={1}
                                value={1}
                                onChange={() => {}}
                            />
                        </Field>
                        <Field label="Timeout (segundos)">
                            <TextInput
                                type="number"
                                min={1}
                                value={120}
                                onChange={() => {}}
                            />
                        </Field>
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="Reintentos y registro">
                <div className="divide-y divide-border">
                    <SettingRow title="Reintentar si falla" description="Vuelve a intentar la ejecución completa ante un error.">
                        <Switch checked={true} onCheckedChange={() => {}} />
                    </SettingRow>
                    {true && (
                        <SettingRow title="Máximo de reintentos">
                            <div className="w-24">
                                <TextInput
                                    type="number"
                                    min={0}
                                    value={3}
                                    onChange={() => {}}
                                />
                            </div>
                        </SettingRow>
                    )}
                    <SettingRow title="Guardar log de ejecución" description="Almacena la salida de cada nodo para depurar.">
                        <Switch checked={true} onCheckedChange={() => {}} />
                    </SettingRow>
                    <SettingRow title="Notificar en error" description="Envía una notificación de escritorio si el flujo falla.">
                        <Switch checked={false} onCheckedChange={() => {}} />
                    </SettingRow>
                </div>
            </SectionCard>

            <SectionCard title="Nodos" description={`${1} nodos en este flujo.`}>
                <ul className="space-y-1.5">
                    <li
                        className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
                    >
                        <span className="flex size-4 items-center justify-center text-[11px] font-medium text-muted-foreground">
                            1
                        </span>
                        <span className="flex size-7 items-center justify-center rounded-md bg-muted text-foreground">
                            <MessageCircle className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{"Hola"}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">{"Hola"}</p>
                        </div>
                        <div className="ml-auto flex items-center gap-1.5">
                                <Badge tone={"success"}>
                                    {"Hola"}
                                </Badge>
                            <Badge tone="neutral">{"Hola"}</Badge>
                        </div>
                    </li>
                </ul>
            </SectionCard>

            <DangerZone
                title="Eliminar flujo"
                description="Se borrará el archivo de definición de este flujo. No se puede deshacer."
                buttonLabel="Eliminar flujo"
                onDelete={() => {}}
            />
        </>
    )
}

/* --------------------------- Workspace detail panel ------------------------- */

function WorkspaceDetail() {
    return (
        <>
            <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                    <div
                        className="flex size-9 items-center justify-center rounded-lg text-white"
                    >
                        <FolderTree className="size-4.5" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-foreground">{"HOla"}</h2>
                        <p className="text-xs text-muted-foreground">{"HOla"}</p>
                    </div>
                </div>
            </div>

            <SectionCard title="General">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nombre">
                        <TextInput value={"Hola"} onChange={() => {}} />
                    </Field>
                    <Field label="Slug" hint="Identificador en rutas y archivos.">
                        <TextInput className="font-mono" value={"Hola"} onChange={() => {}} />
                    </Field>
                    <Field label="Descripción" className="sm:col-span-2">
                        <TextArea value={"Hola"} onChange={() => {}} />
                    </Field>
                </div>
            </SectionCard>

            <DangerZone
                title="Eliminar workspace"
                description={`Se eliminará "Hola" y todos sus Hola flujos.`}
                buttonLabel="Eliminar workspace"
                onDelete={() => {}}
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

