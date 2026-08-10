import { useEffect, useState, useMemo } from 'react';
import { Plus, Workflow, FolderPlus, FolderOpen, Folder, Trash2, FolderX, RefreshCw, ArrowRight } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import { useTabs } from '@/shared/contexts/tabs-context';
import { useNavigate } from 'react-router';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { CreateFlowDialog } from '../components/create-flow-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/components/ui/tooltip';
import { Card, CardAction, CardContent, CardFooter, CardHeader } from '@/ui/components/ui/card';
import { FluxEntry } from '@/types/data';

export function HomeView() {
    const { openTab } = useTabs();
    const navigate = useNavigate();

    const [workspaces, setWorkspaces] = useState<string[]>([]);
    const [workflows, setWorkflows] = useState<FluxEntry[]>([]);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [targetWorkspace, setTargetWorkspace] = useState<string | undefined>(undefined);

    const loadData = async () => {
        try {
            const wks: string[] = await invoke('cmd_get_workspaces');
            setWorkspaces(wks);

            const flows: FluxEntry[] = await invoke('cmd_scan_workflows');
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
            // cmd_add_workspace ahora escanea e indexa automáticamente
            const updatedIndex: FluxEntry[] = await invoke('cmd_add_workspace', { path: selectedPath });
            setWorkflows(updatedIndex);
            const wks: string[] = await invoke('cmd_get_workspaces');
            setWorkspaces(wks);
            return selectedPath;
        }
        return null;
    };

    const handleRemoveWorkspace = async (workspace: string) => {
        await invoke('cmd_remove_workspace', { path: workspace });
        await loadData();
    };

    const handleDeleteWorkflow = async (e: React.MouseEvent, path: string) => {
        e.stopPropagation();
        try {
            await invoke('cmd_delete_workflow', { path });
            await loadData();
        } catch (error) {
            console.error("Failed to delete workflow", error);
        }
    };

    const handleResync = async () => {
        try {
            const flows: FluxEntry[] = await invoke('cmd_resync_workspaces');
            setWorkflows(flows);
        } catch (error) {
            console.error("Failed to resync", error);
        }
    };

    const openCreateDialog = (workspace?: string) => {
        setTargetWorkspace(workspace);
        setDialogOpen(true);
    };

    // Group workflows by workspace
    const groupedData = useMemo(() => {
        return workspaces.map(ws => ({
            workspace: ws,
            flows: workflows.filter(flow => flow.workspace === ws),
        }));
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
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={handleResync}>
                                    <RefreshCw />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Resincronizar índice</p>
                            </TooltipContent>
                        </Tooltip>
                        <Button variant="outline" onClick={handleAddWorkspace}>
                            <FolderPlus />
                            Vincular Workspace
                        </Button>
                        {workspaces.length > 0 && (
                            <Button onClick={() => openCreateDialog()}>
                                <Plus />
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
                                <FolderPlus />
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
                                        <span className="text-[10px] text-muted-foreground truncate max-w-xs hidden lg:block">({workspace})</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="secondary" onClick={() => openCreateDialog(workspace)}>
                                            <Plus />
                                            Añadir workflow
                                        </Button>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={() => handleRemoveWorkspace(workspace)}
                                                >
                                                    <FolderX />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Desvincular workspace</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>

                                {/* Grilla de Workflows */}
                                {flows.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                                        Esta carpeta está vacía. Crea un flujo para empezar.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {flows.map((flow) => (
                                            <button
                                                key={flow.path}
                                                type="button"
                                                onClick={() => handleOpenTab(flow.path)}
                                                className="group"
                                            >
                                                <Card className='group-hover:scale-103 transition-transform'>
                                                    <CardHeader>
                                                        <div className="flex items-start justify-between w-full">
                                                            <div className="grid size-11 place-items-center rounded-lg bg-muted text-primary border">
                                                                <Workflow className="size-5" />
                                                            </div>
                                                            <CardAction>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="destructive"
                                                                            size="icon"
                                                                            className="opacity-0 group-hover:opacity-100"
                                                                            onClick={(e) => handleDeleteWorkflow(e, flow.path)}
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Eliminar</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </CardAction>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="flex flex-col items-start gap-1">
                                                            <h3 title={flow.name} className="font-medium truncate max-w-full">{flow.name}</h3>
                                                            <p title={flow.path} className="text-xs text-muted-foreground truncate opacity-75 text-wrap text-left">{flow.path}</p>
                                                        </div>
                                                    </CardContent>
                                                    <CardFooter className="flex items-center justify-between">
                                                        <span className="font-mono text-xs text-muted-foreground">.flux</span>
                                                        <Button variant={"link"} size={"xs"} className="opacity-0 group-hover:opacity-100">
                                                            Abrir en el editor <ArrowRight />
                                                        </Button>
                                                    </CardFooter>
                                                </Card>

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