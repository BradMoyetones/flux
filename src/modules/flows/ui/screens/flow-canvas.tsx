import { useEffect, useCallback, useState } from 'react';
import {
    ReactFlow,
    Background,
    Panel,
    useReactFlow,
} from '@xyflow/react';

import { useParams, useNavigate } from 'react-router';
import { useTabs } from '@/shared/contexts/tabs-context';
import { useFlowStore, setupFlowListeners, type AppNode } from '../../core/use-flow-store';
import { nodeTypes } from '../../plugins/node-types';
import { pluginRegistry } from '../../plugins/registry';
import { MessageSquare, Play, Save, Settings } from 'lucide-react';
import { ZoomSlider } from '@/ui/components/react-flow/zoom-slider';
import { SidebarProvider, SidebarTrigger } from '@/ui/components/ui/sidebar';
import { FlowSidebar } from '../components/sidebar';
import { NodeConfigPanel } from '../components/node-config-panel';
import { WorkflowSettingsPanel } from '../components/workflow-settings-panel';
import { Button } from '@/ui/components/ui/button';
import { useWhatsAppSession } from '../../plugins/whatsapp/use-whatsapp-session';
import { WaSessionDialog } from '../../plugins/whatsapp/wa-session-dialog';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/ui/components/ui/resizable';
import { ExecutionInspector } from '../components/execution-inspector';
import { Bug } from 'lucide-react';
import { Badge } from '@/ui/components/ui/badge';
import { Spinner } from '@/ui/components/ui/spinner';

export default function FlowCanvas() {
    const { pathId } = useParams();
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [inspectorOpen, setInspectorOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const { updateActiveTabPath } = useTabs();
    const { screenToFlowPosition, fitView } = useReactFlow();
    const wa = useWhatsAppSession();

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
    } = useFlowStore();

    // Hydration
    useEffect(() => {
        if (pathId) {
            const decodedPath = decodeURIComponent(pathId);
            loadWorkflow(decodedPath).then(() => {
                fitView({ duration: 300 });
                // Check if this workflow is currently executing in the backend
                useFlowStore.getState().hydrateExecutionState();
            }).catch(console.error);
        }
    }, [pathId, loadWorkflow, fitView]);

    useEffect(() => {
        setupFlowListeners();
    }, []);

    const [isSaving, setIsSaving] = useState(false);

    const navigate = useNavigate();

    // ──── Save ────
    const onSave = useCallback(async () => {
        if (!pathId) return;
        setIsSaving(true);
        const decodedPath = decodeURIComponent(pathId);

        try {
            const { saveWorkflow } = useFlowStore.getState();
            const newPath = await saveWorkflow(decodedPath);
            
            if (newPath && newPath !== decodedPath) {
                const nextRoute = `/flows/${encodeURIComponent(newPath)}`;
                updateActiveTabPath(nextRoute);
                navigate(nextRoute, { replace: true });
            }
            console.log("Saved successfully");
        } catch (e) {
            console.error("Save failed", e);
        } finally {
            setIsSaving(false);
        }
    }, [pathId, navigate]);

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

    return (
        <SidebarProvider className='min-h-full! h-full'>
            <FlowSidebar />
            <div className="flex-1 relative flex flex-col">
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

                    {/* Panel de configuración del nodo seleccionado */}
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
            </div>
        </SidebarProvider>
    );
}
