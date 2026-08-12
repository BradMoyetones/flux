import { X } from "lucide-react"
import { Button } from "@/ui/components/ui/button"
import { useFlowStore } from "../../core/use-flow-store"
import { ScrollArea } from "@/ui/components/ui/scroll-area"
import { Textarea } from "@/ui/components/ui/textarea"
import { Input } from "@/ui/components/ui/input"
import { Label } from "@/ui/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/components/ui/select"

interface WorkflowSettingsPanelProps {
    onClose: () => void;
}

export function WorkflowSettingsPanel({ onClose }: WorkflowSettingsPanelProps) {
    const { workflowName, setWorkflowName, trigger, setTrigger } = useFlowStore()

    const handleTriggerChange = (type: "manual" | "cron" | "webhook") => {
        if (type === "manual") {
            setTrigger({ type: "manual" })
        } else if (type === "cron") {
            setTrigger({ type: "cron", expression: "0 * * * *" })
        } else if (type === "webhook") {
            setTrigger({ type: "webhook", path: "/hook", method: "POST" })
        }
    }

    return (
        <div className="flex flex-col h-full bg-card border-r">
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex flex-col">
                    <h3 className="text-sm font-semibold">Ajustes del Flujo</h3>
                    <p className="text-xs text-muted-foreground">Reglas de ejecución global.</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    <div className="space-y-2">
                        <Label>Nombre del flujo</Label>
                        <Input
                            value={workflowName}
                            onChange={(e) => setWorkflowName(e.target.value)}
                            placeholder="Mi súper flujo"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Descripción</Label>
                        <Textarea
                            placeholder="Añade una descripción para este flujo..."
                            className="min-h-[80px] text-sm bg-background resize-y"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Modo de ejecución (Trigger)</Label>
                        <Select
                            value={trigger.type}
                            onValueChange={(val: any) => handleTriggerChange(val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un modo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="manual">Manual</SelectItem>
                                <SelectItem value="cron">Programado (Cron)</SelectItem>
                                <SelectItem value="webhook">Webhook</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {trigger.type === "cron" && (
                        <div className="grid gap-4 sm:grid-cols-2 bg-muted/30 p-4 rounded-xl border border-border">
                            <div className="space-y-2 sm:col-span-2">
                                <Label>Expresión CRON</Label>
                                <Input
                                    className="font-mono"
                                    value={trigger.expression}
                                    placeholder="0 * * * *"
                                    onChange={(e) => setTrigger({ ...trigger, expression: e.target.value })}
                                />
                                <p className="text-[10px] text-muted-foreground">Ej: 0 18 * * *</p>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Inicia en (opcional)</Label>
                                <Input
                                    type="datetime-local"
                                    value={trigger.starts_at || ""}
                                    onChange={(e) => setTrigger({ ...trigger, starts_at: e.target.value || undefined })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Expira en (opcional)</Label>
                                <Input
                                    type="datetime-local"
                                    value={trigger.expires_at || ""}
                                    onChange={(e) => setTrigger({ ...trigger, expires_at: e.target.value || undefined })}
                                />
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                                <Label>Máximo de ejecuciones (opcional)</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    placeholder="Sin límite"
                                    value={trigger.max_runs || ""}
                                    onChange={(e) => setTrigger({ ...trigger, max_runs: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                                />
                            </div>
                        </div>
                    )}
                    
                    {trigger.type === "webhook" && (
                        <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-4">
                            <div className="space-y-2">
                                <Label>Método HTTP</Label>
                                <Select
                                    value={trigger.method}
                                    onValueChange={(val: any) => setTrigger({ ...trigger, method: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un método" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GET">GET</SelectItem>
                                        <SelectItem value="POST">POST</SelectItem>
                                        <SelectItem value="PUT">PUT</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Ruta del Webhook</Label>
                                <Input
                                    className="font-mono"
                                    value={trigger.path}
                                    placeholder="/mi-webhook"
                                    onChange={(e) => setTrigger({ ...trigger, path: e.target.value })}
                                />
                                <p className="text-[10px] text-muted-foreground">Ruta relativa para recibir el request.</p>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
