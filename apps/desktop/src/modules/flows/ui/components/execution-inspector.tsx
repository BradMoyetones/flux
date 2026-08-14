import { useFlowStore } from '../../core/use-flow-store';
import { ScrollArea } from '@flux/ui';
import { Badge } from '@flux/ui';
import { Bug, CheckCircle2, CircleDashed, AlertCircle } from 'lucide-react';

export function ExecutionInspector() {
    const { nodes } = useFlowStore();

    // Filter nodes that have some execution status (success, error, or running)
    const executedNodes = nodes.filter(n => n.data.status && n.data.status !== 'pending');

    return (
        <div className="h-full bg-card border-l flex flex-col w-full select-auto cursor-auto">
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
                <Bug className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Inspector de Ejecución</h3>
            </div>

            <ScrollArea className="flex-1 h-10">
                {executedNodes.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                        No hay registros de ejecución.<br/>Ejecuta el flujo para ver los resultados.
                    </div>
                ) : (
                    <div className="p-4 flex flex-col gap-4">
                        {executedNodes.map((node) => (
                            <div key={node.id} className="flex flex-col gap-2 p-3 border rounded-lg shadow-sm bg-background">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {node.data.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                        {node.data.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                                        {node.data.status === 'running' && <CircleDashed className="w-4 h-4 text-blue-500 animate-spin" />}
                                        <span className="text-sm font-medium">{node.data.label}</span>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] font-mono">
                                        {node.data.name || node.id.slice(0,8)}
                                    </Badge>
                                </div>

                                {node.data.error && (
                                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-md">
                                        <p className="text-xs text-red-500 font-mono break-all">{node.data.error}</p>
                                    </div>
                                )}

                                {node.data.result && (
                                    <div className="mt-2 flex flex-col gap-1">
                                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Output</span>
                                        <div className="bg-muted p-2 rounded-md max-h-[400px] overflow-auto">
                                            <pre className="text-[10px] font-mono leading-relaxed text-foreground break-all text-wrap">
                                                {JSON.stringify(node.data.result, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
