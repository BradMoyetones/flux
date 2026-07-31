import { useEffect, useState, useMemo } from 'react';
import { Plus, Workflow, FolderPlus, FolderOpen, Folder } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import { useTabs } from '@/shared/contexts/tabs-context';
import { useNavigate } from 'react-router';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { CreateFlowDialog } from '../components/create-flow-dialog';
import { cn } from '@/shared/utils/utils';

export function HomeView() {
    const { openTab } = useTabs();
    const navigate = useNavigate();
    
    const [workspaces, setWorkspaces] = useState<string[]>([]);
    const [workflows, setWorkflows] = useState<any[]>([]);
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const [targetWorkspace, setTargetWorkspace] = useState<string | undefined>(undefined);
    
    const loadData = async () => {
        try {
            const wks: string[] = await invoke('cmd_get_workspaces');
            setWorkspaces(wks);
            
            const flows: any[] = await invoke('cmd_scan_workflows');
            setWorkflows(flows);
        } catch (error) {
            console.error("Failed to load data", error);
        }
    };

    useEffect(() => {
        loadData();
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
            await loadData();
            return selectedPath;
        }
        return null;
    };

    const openCreateDialog = (workspace?: string) => {
        setTargetWorkspace(workspace);
        setDialogOpen(true);
    };

    // Group workflows by workspace
    const groupedData = useMemo(() => {
        const grouped = workspaces.map(ws => {
            return {
                workspace: ws,
                flows: workflows.filter(flow => flow.path?.startsWith(ws))
            };
        });
        return grouped;
    }, [workspaces, workflows]);

    return (
        <div className="app-scroll h-full overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-primary">Workspaces Locales</p>
                        <h1 className="text-2xl font-semibold tracking-tight text-balance">Tus Flujos de Trabajo</h1>
                        <p className="text-sm text-muted-foreground text-pretty">
                            Gestiona y orquesta automatizaciones desde tus carpetas nativas.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleAddWorkspace}>
                            <FolderPlus className="w-4 h-4 mr-2" />
                            Vincular Workspace
                        </Button>
                        {workspaces.length > 0 && (
                            <Button onClick={() => openCreateDialog()}>
                                <Plus className="w-4 h-4 mr-2" />
                                Nuevo flujo
                            </Button>
                        )}
                    </div>
                </header>

                <section className="mt-8 flex flex-col gap-10">
                    {workspaces.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
                            <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground mb-4 opacity-50" />
                            <h3 className="text-lg font-medium">No tienes workspaces vinculados</h3>
                            <p className="text-sm text-muted-foreground mb-4">Un workspace es una carpeta de tu ordenador donde se guardarán los archivos .flux</p>
                            <Button onClick={handleAddWorkspace}>
                                <FolderPlus className="w-4 h-4 mr-2" />
                                Seleccionar carpeta
                            </Button>
                        </div>
                    ) : (
                        groupedData.map(({ workspace, flows }) => (
                            <div key={workspace} className="flex flex-col gap-4">
                                {/* Encabezado del Workspace */}
                                <div className="flex items-center justify-between border-b border-border pb-2">
                                    <div className="flex items-center gap-2">
                                        <Folder className="text-muted-foreground w-4 h-4" />
                                        <h2 className="text-sm font-semibold truncate max-w-md">{workspace.split(/[/\\]/).pop() || workspace}</h2>
                                    </div>
                                    <Button variant="secondary" size="sm" onClick={() => openCreateDialog(workspace)}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Añadir workflow aquí
                                    </Button>
                                </div>

                                {/* Grilla de Workflows */}
                                {flows.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                                        Esta carpeta está vacía. Crea un flujo para empezar.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {flows.map((flow: any) => (
                                            <button
                                                key={flow.id}
                                                type="button"
                                                onClick={() => flow.path && handleOpenTab(flow.path)}
                                                className="group flex flex-col rounded-xl border border-border bg-card p-5 text-left shadow-sm transition cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="grid size-11 place-items-center rounded-lg bg-muted text-primary">
                                                        <Workflow className="size-5" />
                                                    </div>
                                                    <StatusBadge active={true} />
                                                </div>

                                                <h3 className="mt-4 font-medium">{flow.name}</h3>
                                                <p className="mt-1 text-xs text-muted-foreground truncate opacity-75">{flow.path}</p>

                                                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                                                    <span className="font-mono">.flux file</span>
                                                    <span className="text-primary opacity-0 transition group-hover:opacity-100">
                                                        Abrir en el editor →
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </section>
            </div>

            <CreateFlowDialog 
                open={dialogOpen} 
                onOpenChange={setDialogOpen}
                workspaces={workspaces}
                defaultWorkspace={targetWorkspace}
                onCreated={(path) => {
                    loadData();
                    handleOpenTab(path);
                }}
                onAddWorkspace={handleAddWorkspace}
            />
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
            Listo
        </span>
    );
}
