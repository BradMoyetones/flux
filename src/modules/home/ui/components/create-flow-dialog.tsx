import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/ui/components/ui/dialog";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select";
import { invoke } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";

interface CreateFlowDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaces: string[];
    defaultWorkspace?: string;
    onCreated: (absolutePath: string) => void;
    onAddWorkspace: () => Promise<string | null>;
}

export function CreateFlowDialog({
    open,
    onOpenChange,
    workspaces,
    defaultWorkspace,
    onCreated,
    onAddWorkspace,
}: CreateFlowDialogProps) {
    const [name, setName] = useState("");
    const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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
            const fullPath = await join(selectedWorkspace, filename);
            
            const newWorkflow = {
                id: crypto.randomUUID(),
                name: sanitizedName,
                trigger: { type: "manual" },
                nodes: [],
                edges: []
            };

            await invoke('cmd_save_workflow', { path: fullPath, workflow: newWorkflow });
            onCreated(fullPath);
            onOpenChange(false);
        } catch (err: any) {
            console.error("Failed to create workflow:", err);
            setError(typeof err === 'string' ? err : "Ocurrió un error al guardar el archivo");
        } finally {
            setLoading(false);
        }
    };

    const handleWorkspaceChange = async (value: string) => {
        if (value === "new_workspace") {
            const newPath = await onAddWorkspace();
            if (newPath) {
                setSelectedWorkspace(newPath);
            } else {
                // reverted to default if canceled
                setSelectedWorkspace(defaultWorkspace || workspaces[0] || "");
            }
        } else {
            setSelectedWorkspace(value);
        }
    };

    return (
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
                        <Select value={selectedWorkspace} onValueChange={handleWorkspaceChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un workspace" />
                            </SelectTrigger>
                            <SelectContent>
                                {workspaces.map((ws) => (
                                    <SelectItem key={ws} value={ws}>
                                        {ws.split(/[/\\]/).pop()} <span className="text-xs text-muted-foreground ml-2 truncate">({ws})</span>
                                    </SelectItem>
                                ))}
                                <SelectItem value="new_workspace" className="text-primary font-medium border-t mt-1 pt-2">
                                    + Seleccionar otra carpeta del equipo...
                                </SelectItem>
                            </SelectContent>
                        </Select>
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
    );
}
