import { useEffect, useCallback, useState } from 'react';
import {
    ReactFlow,
    Background,
    Panel,
    useReactFlow,
} from '@xyflow/react';

import { useTabs } from '@/shared/state/tabs';
import { useTab } from '@/shared/state/tab-context';
import { tabScopedAtom } from '@/shared/state/tab-scoped';
import { flowTabPath } from '@/shared/router/route-meta';
import { useFlowStore, useFlowStoreApi, useFlowDirty, setupFlowListeners, type AppNode } from '../../core/use-flow-store';
import { nodeTypes } from '../../plugins/node-types';
import { pluginRegistry } from '../../plugins/registry';
import { MessageSquare, Play, Save, Settings, TerminalSquare } from 'lucide-react';
import { ZoomSlider } from '@flux/ui/react-flow/zoom-slider';
import { SidebarProvider, SidebarTrigger } from '@flux/ui/sidebar';
import { FlowSidebar } from '../components/sidebar';
import { NodeConfigPanel } from '../components/node-config-panel';
import { WorkflowSettingsPanel } from '../components/workflow-settings-panel';
import { Button } from '@flux/ui/button';
import { useWhatsAppSession } from '../../plugins/whatsapp/use-whatsapp-session';
import { WaSessionDialog } from '../../plugins/whatsapp/wa-session-dialog';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@flux/ui/resizable';
import { ExecutionInspector } from '../components/execution-inspector';
import { TerminalConsole } from '../../../terminal/ui/components/terminal-console';
import { useTerminalStore } from '../../../terminal/core/use-terminal-store';
import { Bug } from 'lucide-react';
import { Badge } from '@flux/ui/badge';
import { Spinner } from '@flux/ui/spinner';
import { toast } from 'sonner';

// Mini-estados de UI por tab (atoms): sobreviven al cambio de tab y se liberan al cerrarlo.
const selectedNodeScope = tabScopedAtom<string | null>(null);
const inspectorOpenScope = tabScopedAtom(false);
const settingsOpenScope = tabScopedAtom(false);

export default function FlowCanvas() {
    const { tabId, params, isActive } = useTab();
    // `params.pathId` ya viene decodificado: es la ruta absoluta del archivo .flux
    const filePath = params.pathId;
    const [selectedNodeId, setSelectedNodeId] = selectedNodeScope.useTabAtom();
    const [inspectorOpen, setInspectorOpen] = inspectorOpenScope.useTabAtom();
    const [settingsOpen, setSettingsOpen] = settingsOpenScope.useTabAtom();
    const { updateTabPath, closeTab } = useTabs();
    const flowApi = useFlowStoreApi();
    const isDirty = useFlowDirty(tabId);
    const { screenToFlowPosition, fitView } = useReactFlow();
    const wa = useWhatsAppSession();

    const { isOpen: terminalOpen, toggleOpen: toggleTerminal } = useTerminalStore();

    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        setNodes,
        executeWorkflow,
        stopWorkflow,
        loadWorkflow,
        isExecuting,
        loadError,
    } = useFlowStore();

    // Hydration: la carga es idempotente (no recarga si el tab ya tiene el flujo en memoria,
    // así volver a este tab nunca descarta cambios sin guardar).
    useEffect(() => {
        if (!filePath) return;
        loadWorkflow(filePath).then(() => {
            if (flowApi.getState().loaded) {
                fitView({ duration: 300 });
                // Check if this workflow is currently executing in the backend
                flowApi.getState().hydrateExecutionState();
            }
        }).catch(console.error);
    }, [filePath, loadWorkflow, fitView, flowApi]);

    useEffect(() => {
        setupFlowListeners();
    }, []);

    const [isSaving, setIsSaving] = useState(false);

    // ──── Save ────
    const onSave = useCallback(async () => {
        if (!filePath) return;
        setIsSaving(true);

        try {
            const newPath = await flowApi.getState().saveWorkflow(filePath);

            if (newPath && newPath !== filePath) {
                // Renombrado: el tab pasa a apuntar al nuevo archivo.
                updateTabPath(tabId, flowTabPath(newPath));
            }
            toast.success('Flujo guardado');
        } catch (e) {
            console.error("Save failed", e);
            toast.error('No se pudo guardar el flujo', {
                description: typeof e === 'string' ? e : (e as { message?: string })?.message,
            });
        } finally {
            setIsSaving(false);
        }
    }, [filePath, flowApi, tabId, updateTabPath]);

    // Cmd/Ctrl+S guarda, solo en el tab visible
    useEffect(() => {
        if (!isActive) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                onSave();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isActive, onSave]);

    // ──── Drag & Drop (API nativa dataTransfer, sin React state) ────
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const onDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();

        const nodeType = event.dataTransfer.getData("application/flux-node-type");
        if (!nodeType) return;

        const plugin = pluginRegistry[nodeType];
        if (!plugin) return;

        const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
        });

        const newNode: AppNode = {
            id: crypto.randomUUID(),
            type: nodeType,
            position,
            data: {
                name: `${nodeType}_${nodes.length + 1}`,
                label: plugin.label,
                config: { ...plugin.defaultConfig },
            },
        };

        setNodes([...nodes, newNode]);

    }, [nodes, setNodes, screenToFlowPosition]);

    // ──── Node selection ────
    const onNodeClick = useCallback((_: React.MouseEvent, node: AppNode) => {
        setSelectedNodeId(node.id);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
    }, []);

    const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : undefined;

    const onUpdateNodeConfig = useCallback((nodeId: string, config: Record<string, any>) => {
        setNodes(nodes.map(n =>
            n.id === nodeId
                ? { ...n, data: { ...n.data, config } }
                : n
        ));
    }, [nodes, setNodes]);

    const onUpdateNodeLabel = useCallback((nodeId: string, label: string) => {
        setNodes(nodes.map(n =>
            n.id === nodeId
                ? { ...n, data: { ...n.data, label } }
                : n
        ));
    }, [nodes, setNodes]);

    const onUpdateNodeName = useCallback((nodeId: string, name: string) => {
        // Enforce slug format (lowercase, alphanumeric, underscores)
        const slugified = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        setNodes(nodes.map(n =>
            n.id === nodeId
                ? { ...n, data: { ...n.data, name: slugified } }
                : n
        ));
    }, [nodes, setNodes]);

    if (loadError) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-8 text-center">
                <p className="text-sm font-medium">No se pudo abrir el flujo</p>
                <p className="max-w-md break-all font-mono text-xs text-muted-foreground">{filePath}</p>
                <p className="max-w-md text-xs text-destructive">{loadError}</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => filePath && loadWorkflow(filePath, { force: true })}>
                        Reintentar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => closeTab(tabId)}>
                        Cerrar tab
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <SidebarProvider className='min-h-full! h-full'>
            <FlowSidebar />
            <div className="flex-1 relative flex flex-col">
                {/* @ts-ignore: Prop direction is valid but TS definition might be missing it */}
                <ResizablePanelGroup direction="vertical">
                    <ResizablePanel defaultSize={terminalOpen ? 70 : 100}>
                        {/* @ts-ignore: Prop direction is valid but TS definition might be missing it */}
                        <ResizablePanelGroup direction="horizontal">
                            {settingsOpen && (
                                <>
                                    <ResizablePanel defaultSize={20} minSize={300} maxSize={800}>
                                        <WorkflowSettingsPanel onClose={() => setSettingsOpen(false)} />
                                    </ResizablePanel>
                                    <ResizableHandle withHandle />
                                </>
                            )}

                            <ResizablePanel defaultSize={inspectorOpen && settingsOpen ? 45 : (inspectorOpen || settingsOpen ? 70 : 100)} className="relative">
                                <ResizablePanelGroup orientation="vertical">
                                    <ResizablePanel defaultSize="25%">

                                        <ReactFlow
                                            nodes={nodes}
                                            edges={edges}
                                            onNodesChange={onNodesChange}
                                            onEdgesChange={onEdgesChange}
                                            onConnect={onConnect}
                                            onDragOver={onDragOver}
                                            onDrop={onDrop}
                                            onNodeClick={onNodeClick}
                                            onPaneClick={onPaneClick}
                                            nodeTypes={nodeTypes}
                                            fitView
                                        >
                                            <Panel position="top-left">
                                                <SidebarTrigger variant={"outline"} className="shadow-lg" />
                                            </Panel>

                                            <Background
                                                color="color-mix(in srgb, var(--muted-foreground) 50%, transparent)"
                                            />
                                            <ZoomSlider position='bottom-left' />

                                            <Panel position="top-right" className="flex gap-2 bg-card p-2 rounded-xl shadow-lg border">
                                                <WaSessionDialog
                                                    sessions={wa.sessions}
                                                    loading={wa.loading}
                                                    error={wa.error}
                                                    qrUrl={wa.qrUrl}
                                                    linkingSessionId={wa.linkingSessionId}
                                                    onStartSession={wa.startSession}
                                                    onStopSession={wa.stopSession}
                                                    onDeleteSession={wa.deleteSession}
                                                    onRefresh={wa.refreshSessions}
                                                    onSetLinking={wa.setLinkingSessionId}
                                                    trigger={
                                                        <Button variant="outline">
                                                            <MessageSquare className="text-green-500" />
                                                            WhatsApp
                                                            {wa.sessions.filter(s => s.connected).length > 0 && (
                                                                <Badge variant="secondary" className=" text-green-400">
                                                                    {wa.sessions.filter(s => s.connected).length}
                                                                </Badge>
                                                            )}
                                                        </Button>
                                                    }
                                                />

                                                <Button
                                                    onClick={() => setInspectorOpen(!inspectorOpen)}
                                                    variant={inspectorOpen ? "secondary" : "outline"}
                                                    title="Debug Inspector"
                                                >
                                                    <Bug />
                                                    Debug
                                                </Button>

                                                <Button
                                                    onClick={toggleTerminal}
                                                    variant={terminalOpen ? "secondary" : "outline"}
                                                    title="Console"
                                                >
                                                    <TerminalSquare className="w-4 h-4" />
                                                    Console
                                                </Button>

                                                <Button
                                                    onClick={() => setSettingsOpen(!settingsOpen)}
                                                    variant={settingsOpen ? "secondary" : "outline"}
                                                    title="Ajustes del Flujo"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                    Ajustes
                                                </Button>

                                                <Button
                                                    onClick={onSave}
                                                    variant='outline'
                                                    title="Save Workflow"
                                                    disabled={isSaving}
                                                >
                                                    {isSaving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                                    {isSaving ? 'Guardando...' : 'Save'}
                                                    {isDirty && !isSaving && (
                                                        <span className="size-1.5 rounded-full bg-amber-500" aria-label="Cambios sin guardar" />
                                                    )}
                                                </Button>

                                                <Button
                                                    onClick={isExecuting ? stopWorkflow : executeWorkflow}
                                                    disabled={nodes.length === 0}
                                                    variant={isExecuting ? "destructive" : "default"}
                                                >
                                                    <Play className={isExecuting ? "animate-pulse hidden" : ""} />
                                                    {isExecuting ? 'Stop Flow' : 'Execute Flow'}
                                                </Button>
                                            </Panel>
                                        </ReactFlow>
                                    </ResizablePanel>

                                    {terminalOpen && (
                                        <>
                                            <ResizableHandle withHandle />
                                            <ResizablePanel defaultSize={30} minSize={100} maxSize={800}>
                                                <TerminalConsole />
                                            </ResizablePanel>
                                        </>
                                    )}
                                </ResizablePanelGroup>
                            </ResizablePanel>

                            {selectedNode && (
                                <>
                                    <ResizableHandle withHandle />
                                    <ResizablePanel defaultSize={20} minSize={300} maxSize={800}>
                                        <NodeConfigPanel
                                            node={selectedNode}
                                            onClose={() => setSelectedNodeId(null)}
                                            onUpdateConfig={onUpdateNodeConfig}
                                            onUpdateLabel={onUpdateNodeLabel}
                                            onUpdateName={onUpdateNodeName}
                                        />
                                    </ResizablePanel>
                                </>
                            )}

                            {inspectorOpen && (
                                <>
                                    <ResizableHandle withHandle />
                                    <ResizablePanel defaultSize={20} minSize={300} maxSize={1000}>
                                        <ExecutionInspector />
                                    </ResizablePanel>
                                </>
                            )}
                        </ResizablePanelGroup>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </SidebarProvider>
    );
}
