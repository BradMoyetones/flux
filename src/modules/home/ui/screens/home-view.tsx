import { useEffect, useState } from 'react';
import { Database, FileSpreadsheet, Plus, Search, Workflow, FolderPlus, type LucideIcon } from 'lucide-react';

import { cn } from '@/shared/utils/utils';
import { Button } from '@/ui/components/ui/button';
import { useTabs } from '@/shared/contexts/tabs-context';
import { useNavigate } from 'react-router';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';

interface WorkflowMeta {
    id: string;
    name: string;
    path: string; // the absolute path to .json
}

export function HomeView() {
    const { openTab } = useTabs();
    const navigate = useNavigate();
    const [workflows, setWorkspaces] = useState<any[]>([]);
    
    // We fetch the workflows which now contains the real flows from Rust
    const fetchWorkflows = async () => {
        try {
            const result: any[] = await invoke('cmd_scan_workflows');
            setWorkspaces(result);
        } catch (error) {
            console.error("Failed to scan workflows", error);
        }
    };

    useEffect(() => {
        fetchWorkflows();
    }, []);

    const handleOpenTab = (absolutePath: string) => {
        const routePath = `/flows/${encodeURIComponent(absolutePath)}`;
        const openedPath = openTab(routePath);
        navigate(openedPath);
    };

    const handleAddWorkspace = async () => {
        const selectedPath = await open({
            directory: true,
            multiple: false,
            title: 'Seleccionar Carpeta de Workspace'
        });
        
        if (selectedPath && typeof selectedPath === 'string') {
            await invoke('cmd_add_workspace', { path: selectedPath });
            await fetchWorkflows();
        }
    };

    const handleNewFlow = async () => {
        const filePath = await save({
            title: 'Crear nuevo flujo de trabajo',
            filters: [{ name: 'Flujo', extensions: ['json'] }],
            defaultPath: 'nuevo-flujo.json'
        });

        if (filePath) {
            const newWorkflow = {
                id: crypto.randomUUID(),
                name: filePath.split(/[/\\]/).pop()?.replace('.json', '') || 'Nuevo Flujo',
                trigger: { type: "manual" },
                nodes: [],
                edges: []
            };

            try {
                await invoke('cmd_save_workflow', { path: filePath, workflow: newWorkflow });
                await fetchWorkflows();
                handleOpenTab(filePath);
            } catch (err) {
                console.error("Error creating workflow", err);
            }
        }
    };

    return (
        <div className="app-scroll h-full overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-primary">Workspaces Locales</p>
                        <h1 className="text-2xl font-semibold tracking-tight text-balance">Tus Flujos de Trabajo</h1>
                        <p className="text-sm text-muted-foreground text-pretty">
                            Todo se almacena de forma nativa en tu disco duro.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleAddWorkspace}>
                            <FolderPlus className="w-4 h-4 mr-2" />
                            Vincular Workspace
                        </Button>
                        <Button onClick={handleNewFlow}>
                            <Plus className="w-4 h-4 mr-2" />
                            Nuevo flujo
                        </Button>
                    </div>
                </header>

                <section className="mt-8">
                    {workflows.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
                            <Workflow className="w-10 h-10 mx-auto text-muted-foreground mb-4 opacity-50" />
                            <h3 className="text-lg font-medium">No hay flujos vinculados</h3>
                            <p className="text-sm text-muted-foreground mb-4">Añade una carpeta para empezar a leer tus JSON.</p>
                            <Button onClick={handleAddWorkspace}>Vincular Workspace</Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {workflows.map((flow: any) => {
                                // En el backend, asumiendo que `flow` trae nombre y path
                                const title = flow.name || "Flujo sin nombre";
                                return (
                                    <button
                                        key={flow.id || flow.path}
                                        type="button"
                                        onClick={() => handleOpenTab(flow.path || flow.id)} // temporal fallback
                                        className="group flex flex-col rounded-xl border border-border bg-card p-5 text-left shadow-sm transition cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="grid size-11 place-items-center rounded-lg bg-muted text-primary">
                                                <Workflow className="size-5" />
                                            </div>
                                            <StatusBadge active={true} />
                                        </div>

                                        <h3 className="mt-4 font-medium">{title}</h3>
                                        <p className="mt-1 text-sm text-muted-foreground truncate">{flow.path}</p>

                                        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                                            <span>Local JSON</span>
                                            <span className="text-primary opacity-0 transition group-hover:opacity-100">
                                                Abrir →
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

function StatusBadge({ active }: { active: boolean }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'
            )}
        >
            <span className={cn('size-1.5 rounded-full', active ? 'bg-emerald-400' : 'bg-muted-foreground')} />
            {active ? 'Activo' : 'Inactivo'}
        </span>
    );
}
