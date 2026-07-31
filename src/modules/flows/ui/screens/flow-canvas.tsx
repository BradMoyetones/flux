import { useEffect, useCallback } from 'react';
import {
    ReactFlow,
    Background,
    Panel,
} from '@xyflow/react';

import { useFlowStore, setupFlowListeners, AppNode } from '../../core/use-flow-store';
import { HttpNode } from '../../plugins/http/http-node';
import { Play, Plus } from 'lucide-react';
import { ZoomSlider } from '@/ui/components/react-flow/zoom-slider';
import { SidebarProvider, SidebarTrigger } from '@/ui/components/ui/sidebar';
import { FlowSidebar } from '../components/sidebar';
import { Button } from '@/ui/components/ui/button';

const nodeTypes = {
    http: HttpNode,
};

export default function FlowCanvas() {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        setNodes,
        executeWorkflow,
        isExecuting,
    } = useFlowStore();

    useEffect(() => {
        setupFlowListeners();
    }, []);

    const onAddNode = useCallback(() => {
        const newNode: AppNode = {
            id: crypto.randomUUID(),
            type: 'http',
            position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
            data: {
                label: `HTTP Request ${nodes.length + 1}`,
                config: { method: 'GET', url: 'https://api.github.com' }
            }
        };
        setNodes([...nodes, newNode]);
    }, [nodes, setNodes]);

    return (
        <SidebarProvider className='min-h-full!'>
            <FlowSidebar />
            <div className="flex-1">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
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
                        <Button
                            onClick={onAddNode}
                            variant='secondary'
                            size='icon'
                            title="Add HTTP Node"
                        >
                            <Plus />
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
            </div>
        </SidebarProvider>
    );
}
