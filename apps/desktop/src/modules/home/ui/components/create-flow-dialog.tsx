import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@flux/ui';
import { Button } from '@flux/ui';
import { Input } from '@flux/ui';
import { api, type Workspace } from "@flux/api";
import SelectWorkspaceModal from "./select-workspace";
import { Folder } from "lucide-react";
import { workspaceName } from "../../lib/format";
import { useHomeStore } from "../../stores/home-store";
import { useTabs } from '@/shared/contexts/tabs-context';
import { useNavigate } from 'react-router';

export function CreateFlowDialog() {
    const open = useHomeStore((state) => state.dialogOpen);
    const onOpenChange = useHomeStore((state) => state.setDialogOpen);
    const workspaces = useHomeStore((state) => state.workspaces);
    const defaultWorkspace = useHomeStore((state) => state.targetWorkspace);
    const onAddWorkspace = useHomeStore((state) => state.addWorkspace);
    const loadData = useHomeStore((state) => state.loadData);

    const { openTab } = useTabs();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // State para modal de selección de workspace
    const [selectWorkspaceOpen, setSelectWorkspaceOpen] = useState(false);

    // Auto-select
    useEffect(() => {
        if (open) {
            setName("");
            setError("");
            if (defaultWorkspace && workspaces.includes(defaultWorkspace)) {
                setSelectedWorkspace(defaultWorkspace);
            } else if (workspaces.length > 0) {
                setSelectedWorkspace(workspaces[0]);
            }
        }
    }, [open, defaultWorkspace, workspaces]);

    const handleCreate = async () => {
        if (!name.trim()) {
            setError("El nombre del flujo es requerido");
            return;
        }
        if (!selectedWorkspace) {
            setError("Debes seleccionar un workspace de destino");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // sanitize name and force .flux extension
            const sanitizedName = name.trim().replace(/[^a-zA-Z0-9_-]/g, "-");
            const filename = sanitizedName.endsWith(".flux") ? sanitizedName : `${sanitizedName}.flux`;

            // Usamos path.join nativo para construir la ruta absoluta perfecta
            const fullPath = await api.path.join(selectedWorkspace as any, filename);

            const newWorkflow = {
                id: crypto.randomUUID(),
                name: sanitizedName,
                trigger: { type: "manual" },
                nodes: [],
                edges: []
            };

            await api.workflows.saveWorkflow(fullPath, newWorkflow as any);
            
            // Registrar en el índice para que aparezca instantáneamente en el Home
            await api.workflows.registerWorkflow(
                fullPath,
                sanitizedName,
                selectedWorkspace as any,
            );

            loadData();
            
            const routePath = `/flows/${encodeURIComponent(fullPath)}`;
            const openedPath = openTab(routePath);
            navigate(openedPath);
            
            onOpenChange(false);
        } catch (err: any) {
            console.error("Failed to create workflow:", err);
            setError(typeof err === 'string' ? err : "Ocurrió un error al guardar el archivo");
        } finally {
            setLoading(false);
        }
    };

    const handleWorkspaceChange = async (workspace: Workspace) => {
        if (workspace === "new_workspace") {
            const newPath = await onAddWorkspace();
            if (newPath) {
                setSelectedWorkspace(newPath);
            } else {
                // reverted to default if canceled
                setSelectedWorkspace(defaultWorkspace || workspaces[0] || null);
            }
        } else {
            setSelectedWorkspace(workspace);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Crear Nuevo Workflow</DialogTitle>
                        <DialogDescription>
                            Nombra tu flujo y selecciona la carpeta (Workspace) donde deseas guardarlo. La extensión será .flux.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label htmlFor="name" className="text-sm font-medium">Nombre del Flujo</label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="ej. lead-routing-ventas"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Workspace Destino</label>
                            <Button onClick={() => setSelectWorkspaceOpen(true)} variant="outline" className="justify-start overflow-hidden">
                                <Folder />
                                {workspaceName(selectedWorkspace ?? "Seleccionar Workspace") } <span className="text-xs text-muted-foreground ml-2 truncate!">({selectedWorkspace})</span>
                            </Button>
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCreate} disabled={loading}>
                            {loading ? "Guardando..." : "Crear Flujo"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <SelectWorkspaceModal 
                open={selectWorkspaceOpen}
                onOpenChange={setSelectWorkspaceOpen}
                onSelect={handleWorkspaceChange}
                workspaces={workspaces}
                defaultWorkspace={selectedWorkspace || undefined}
            />
        </>
    );
}
