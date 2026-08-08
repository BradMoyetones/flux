import { useEffect, useCallback, useState } from 'react';
import {
    ReactFlow,
    Background,
    Panel,
    useReactFlow,
} from '@xyflow/react';

import { useParams } from 'react-router';
import { useFlowStore, setupFlowListeners, type AppNode } from '../../core/use-flow-store';
import { nodeTypes } from '../../plugins/node-types';
import { pluginRegistry } from '../../plugins/registry';
import { MessageSquare, Play, Save } from 'lucide-react';
import { ZoomSlider } from '@/ui/components/react-flow/zoom-slider';
import { SidebarProvider, SidebarTrigger } from '@/ui/components/ui/sidebar';
import { FlowSidebar } from '../components/sidebar';
import { NodeConfigPanel } from '../components/node-config-panel';
import { Button } from '@/ui/components/ui/button';
import { invoke } from '@tauri-apps/api/core';
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
    const { screenToFlowPosition } = useReactFlow();
    const wa = useWhatsAppSession();

    const {
        nodes,
        edges,
        workflowId,
        onNodesChange,
        onEdgesChange,
        onConnect,
        setNodes,
        executeWorkflow,
        loadWorkflow,
        isExecuting,
    } = useFlowStore();

    // Hydration
    useEffect(() => {
        if (pathId) {
            const decodedPath = decodeURIComponent(pathId);
            loadWorkflow(decodedPath).catch(console.error);
        }
    }, [pathId, loadWorkflow]);

    useEffect(() => {
        setupFlowListeners();
    }, []);

    const [isSaving, setIsSaving] = useState(false);

    // ──── Save ────
    const onSave = useCallback(async () => {
        if (!pathId) return;
        setIsSaving(true);
        const decodedPath = decodeURIComponent(pathId);

        const workflowPayload = {
            id: workflowId,
            name: decodedPath.split(/[/\\]/).pop()?.replace('.flux', '').replace('.json', '') || 'Flujo',
            trigger: { type: "manual" },
            nodes: nodes.map(n => ({
                id: n.id,
                name: n.data.name || n.id,
                type: n.type || 'default',
                label: n.data.label,
                config: n.data.config,
                position: n.position,
            })),
            edges: edges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle,
                targetHandle: e.targetHandle,
            })),
        };

        try {
            await invoke('cmd_save_workflow', { path: decodedPath, workflow: workflowPayload });
            console.log("Saved successfully");
        } catch (e) {
            console.error("Save failed", e);
        } finally {
            setIsSaving(false);
        }
    }, [pathId, workflowId, nodes, edges]);

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
        <SidebarProvider className='min-h-full!'>
            <FlowSidebar />
            <div className="flex-1 relative flex flex-col">
                {/* @ts-ignore: Prop direction is valid but TS definition might be missing it */}
                <ResizablePanelGroup direction="horizontal">
                    <ResizablePanel defaultSize={inspectorOpen ? 70 : 100} className="relative">
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
                                <SidebarTrigger />
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
                                    onClick={onSave}
                                    variant='outline'
                                    title="Save Workflow"
                                    disabled={isSaving}
                                >
                                    {isSaving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                    {isSaving ? 'Guardando...' : 'Save'}
                                </Button>

                                <Button
                                    onClick={executeWorkflow}
                                    disabled={isExecuting || nodes.length === 0}
                                >
                                    <Play className={isExecuting ? "animate-pulse" : ""} />
                                    {isExecuting ? 'Running...' : 'Execute Flow'}
                                </Button>
                            </Panel>
                        </ReactFlow>

                        {/* Panel de configuración del nodo seleccionado */}
                        <NodeConfigPanel
                            node={selectedNode}
                            onClose={() => setSelectedNodeId(null)}
                            onUpdateConfig={onUpdateNodeConfig}
                            onUpdateLabel={onUpdateNodeLabel}
                            onUpdateName={onUpdateNodeName}
                        />
                    </ResizablePanel>

                    {inspectorOpen && (
                        <>
                            <ResizableHandle withHandle />
                            <ResizablePanel defaultSize={30} minSize={20}>
                                <ExecutionInspector />
                            </ResizablePanel>
                        </>
                    )}
                </ResizablePanelGroup>
            </div>
        </SidebarProvider>
    );
}
