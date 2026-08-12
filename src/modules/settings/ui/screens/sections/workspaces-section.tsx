"use client"

import { useEffect, useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/ui/card"
import { Label } from "@/ui/components/ui/label"
import { Input } from "@/ui/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/ui/components/ui/tabs"
import { useFlowStore } from "@/modules/flows/core/use-flow-store"
import { Button } from "@/ui/components/ui/button"
import { Trigger } from "@/types/data"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select"
import {
    Folder,
    Play,
    Plus,
    Sparkles,
    Trash2,
    Workflow,
} from "lucide-react"
import { cn } from "@/shared/utils/utils"
import { useHomeStore } from "@/modules/home/stores/home-store"
import { FluxEntry, Workspace } from "@/types/data"
import { workspaceName } from "@/modules/home/lib/format"
import { toast } from "sonner"
import { Spinner } from "@/ui/components/ui/spinner"

export function WorkspacesSection() {
    const { workspaces, workflows, loadData, addWorkspace } = useHomeStore()
    const firstWs = workspaces[0] // Esto puede no existir
    const [selWs, setSelWs] = useState<Workspace | null>(firstWs ?? null)
    const [selWf, setSelWf] = useState<FluxEntry | null>(null)

    const [isAdding, setIsAdding] = useState(false)

    const workspace = useMemo(() => workspaces.find((w) => w === selWs) ?? null, [workspaces, selWs])
    const workflow = useMemo(
        () => workflows.find((f) => f === selWf) ?? null,
        [workflows, selWf],
    )

    useEffect(() => {
        loadData();
    }, []);

    const handleAddWorkspace = async () => {
        setIsAdding(true);
        await addWorkspace();
        setIsAdding(false);
    };

    return (
        <div className="flex flex-col-reverse gap-4 lg:flex-row">
            {/* Panel de detalle */}
            <div className="min-w-0 flex-1 space-y-5">
                {workflow && workspace ? (
                    <WorkflowDetail
                        workspace={workspace}
                        workflow={workflow}
                    />
                ) : workspace ? (
                    <WorkspaceDetail
                        workspace={workspace}
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
                        <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Nuevo workspace"
                            onClick={handleAddWorkspace}
                            disabled={isAdding}
                        >
                            {isAdding ? (
                                <Spinner />
                            ) : (
                                <Plus />
                            )}
                        </Button>
                    </div>
                    <nav className="max-h-[540px] space-y-3 overflow-y-auto p-2">
                        {workspaces.map((ws) => (
                            <div key={ws}>
                                <Button
                                    variant={selWs === ws && !selWf ? "secondary" : "ghost"}
                                    type="button"
                                    onClick={() => {
                                        setSelWs(ws)
                                        setSelWf(null)
                                    }}
                                    className={"w-full"}
                                >
                                    <Folder />

                                    <span className="truncate text-sm font-medium">{workspaceName(ws)}</span>
                                    <span className="ml-auto text-[11px] text-muted-foreground">
                                        {workflows.filter((wf) => wf.workspace === ws).length}
                                    </span>
                                </Button>
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
}: {
    workspace: Workspace
    workflow: FluxEntry
}) {
    const { deleteWorkflow } = useHomeStore()
    const { loadWorkflow, saveWorkflow, setTrigger, trigger, executeWorkflow, isExecuting, metadata } = useFlowStore()
    
    const [isDeleting, setIsDeleting] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        let mounted = true;
        setIsLoaded(false);
        loadWorkflow(workflow.path).then(() => {
            if (mounted) setIsLoaded(true);
        });

        return () => {
            mounted = false;
        }
    }, [workflow.path, loadWorkflow])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await saveWorkflow(workflow.path)
            toast.success("Configuración guardada exitosamente")
        } catch (e) {
            toast.error("Error al guardar la configuración")
        } finally {
            setIsSaving(false)
        }
    }

    const lastExecution = metadata?.last_execution ? new Date(metadata.last_execution).toLocaleString() : "Nunca"
    const totalExecutions = metadata?.total_executions || 0
    const triggerType = trigger?.type || "manual"

    return (
        <>
            {/* Header */}
            <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div
                            className="mt-0.5 flex size-9 items-center justify-center rounded-lg text-white"
                        >
                            <Workflow className="size-4.5 text-foreground" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-semibold text-foreground">{workflow.name}</h2>
                            </div>
                            <p className="font-mono text-xs text-muted-foreground">{workflow.path}</p>
                            <p className="text-xs text-muted-foreground">
                                en <span className="text-foreground">{workspaceName(workspace)}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isLoaded && (
                            <Button variant="outline" size="sm" onClick={executeWorkflow} disabled={isExecuting}>
                                {isExecuting ? <Spinner className="mr-2" /> : <Play className="mr-2 size-3.5" />}
                                {isExecuting ? "Ejecutando..." : "Ejecutar"}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
                    <Stat label="Última ejecución" value={lastExecution} />
                    <Stat label="Ejecuciones Totales" value={totalExecutions.toString()} />
                </div>
            </div>

            {!isLoaded ? (
                <div className="flex h-32 items-center justify-center">
                    <Spinner />
                </div>
            ) : (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>General</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label>Nombre</Label>
                                    <p className="text-sm text-muted-foreground">{workflow.name}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Ejecución</CardTitle>
                            <CardDescription>Cómo y cuándo corre este flujo.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-1.5">
                                <Label>Modo de ejecución</Label>
                                <Tabs value={triggerType} onValueChange={(v: string) => {
                                    if (v === "manual") setTrigger({ type: "manual" });
                                    else if (v === "cron") setTrigger({ type: "cron", expression: "", timezone: "" } as Trigger);
                                    else if (v === "webhook") setTrigger({ type: "webhook", path: "", method: "POST" } as Trigger);
                                }}>
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="manual">Manual</TabsTrigger>
                                        <TabsTrigger value="cron">Programado</TabsTrigger>
                                        <TabsTrigger value="webhook">Webhook</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            {triggerType === "cron" && (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label>Expresión CRON</Label>
                                        <Input
                                            className="font-mono"
                                            value={(trigger as any).expression || ""}
                                            placeholder="0 18 * * *"
                                            onChange={(e) => setTrigger({ ...trigger, expression: e.target.value } as Trigger)}
                                        />
                                        <p className="text-[11px] text-muted-foreground">Formato estándar. Ej: 0 18 * * *</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Zona horaria</Label>
                                        <Select 
                                            value={(trigger as any).timezone || ""} 
                                            onValueChange={(val) => setTrigger({ ...trigger, timezone: val } as Trigger)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="America/Bogota">America/Bogota</SelectItem>
                                                <SelectItem value="America/Mexico_City">America/Mexico_City</SelectItem>
                                                <SelectItem value="America/New_York">America/New_York</SelectItem>
                                                <SelectItem value="UTC">UTC</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {triggerType === "webhook" && (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label>Ruta (Path)</Label>
                                        <Input
                                            value={(trigger as any).path || ""}
                                            placeholder="/webhook/recibir"
                                            onChange={(e) => setTrigger({ ...trigger, path: e.target.value } as Trigger)}
                                        />
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex justify-end pt-2 border-t border-border">
                                <Button onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? <Spinner className="mr-2" /> : null}
                                    Guardar Configuración
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            <DangerZone
                title="Eliminar flujo"
                description="Se borrará el archivo de definición de este flujo. No se puede deshacer."
                buttonLabel="Eliminar flujo"
                onDelete={() => {
                    toast(`¿Seguro quieres eliminar el flujo ${workflow.name}?`, {
                        action: {
                            label: 'Eliminar',
                            onClick: async () => {
                                setIsDeleting(true);
                                await deleteWorkflow(workflow.path);
                                setIsDeleting(false);
                            }
                        }
                    })
                }}
                loading={isDeleting}
            />
        </>
    )
}

/* --------------------------- Workspace detail panel ------------------------- */

function WorkspaceDetail({
    workspace,
}: {
    workspace: Workspace
}) {
    const [loading, setLoading] = useState(false)
    const { removeWorkspace } = useHomeStore()
    return (
        <>
            <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                    <div
                        className="flex size-9 items-center justify-center rounded-lg text-white"
                    >
                        <Folder className="size-4.5" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-foreground">{workspaceName(workspace)}</h2>
                        <p className="text-xs text-muted-foreground">{workspace}</p>
                    </div>
                </div>
            </div>

            <DangerZone
                title="Eliminar workspace"
                description={`Se eliminará "${workspaceName(workspace)}" y todos sus flujos.`}
                buttonLabel="Eliminar workspace"
                onDelete={() => {
                    toast('¿Seguro que deseas eliminar este workspace?', {
                        description: 'Por seguridad los Workflows asociados a este workspace no serán eliminados.',
                        action: {
                            label: 'Eliminar',
                            onClick: async () => {
                                setLoading(true);
                                toast.promise(removeWorkspace(workspace), {
                                    loading: 'Eliminando workspace...',
                                    success: 'Workspace eliminado exitosamente!',
                                    error: 'Error al eliminar workspace'
                                });
                                setLoading(false);
                            }
                        }
                    })
                }}
                loading={loading}
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
    loading,
}: {
    title: string
    description: string
    buttonLabel: string
    onDelete: () => void
    loading: boolean
}) {
    return (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                </div>
                <Button variant="destructive" size="sm" onClick={onDelete} disabled={loading}>
                    {loading ? (
                        <Spinner />
                    ) : (
                        <Trash2 />
                    )}
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

