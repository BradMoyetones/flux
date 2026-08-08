import { create } from 'zustand';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { NodeExecutionEvent, WorkflowExecutionEvent, NodeStatus, Workflow } from './types';

export type AppNodeData = {
  name: string;
  label: string;
  config: Record<string, any>;
  status?: NodeStatus;
  result?: any;
  error?: string;
};

export type AppNode = Node<AppNodeData>;

interface FlowState {
  workflowId: string;
  nodes: AppNode[];
  edges: Edge[];
  isExecuting: boolean;
  
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  
  // Custom Actions
  updateNodeStatus: (nodeId: string, status: NodeStatus, result?: any, error?: string) => void;
  executeWorkflow: () => Promise<void>;
  loadWorkflow: (filePath: string) => Promise<void>;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  workflowId: crypto.randomUUID(),
  nodes: [],
  edges: [],
  isExecuting: false,

  loadWorkflow: async (filePath: string) => {
    try {
      const workflow: Workflow = await invoke('cmd_get_workflow', { path: filePath });
      
      const reactFlowNodes: AppNode[] = workflow.nodes.map((n, index) => ({
        id: n.id,
        type: n.type || 'http', // Default to http for now
        position: n.position || { x: 200, y: index * 150 },
        data: {
          name: (n as any).name || `node_${index + 1}`,
          label: n.label || 'Node',
          config: n.config || {},
        },
      }));

      const reactFlowEdges: Edge[] = workflow.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      }));

      set({
        workflowId: workflow.id,
        nodes: reactFlowNodes,
        edges: reactFlowEdges,
      });
    } catch (err) {
      console.error("Failed to load workflow", err);
    }
  },

  onNodesChange: (changes: NodeChange<AppNode>[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  
  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  
  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },
  
  setNodes: (nodes: AppNode[]) => {
    set({ nodes });
  },
  
  setEdges: (edges: Edge[]) => {
    set({ edges });
  },

  updateNodeStatus: (nodeId, status, result, error) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, status, result, error },
          };
        }
        return node;
      }),
    });
  },

  executeWorkflow: async () => {
    const { workflowId, nodes, edges } = get();
    set({ isExecuting: true });

    // Reset status of all nodes
    set({
      nodes: nodes.map(n => ({ ...n, data: { ...n.data, status: 'pending', result: undefined, error: undefined } }))
    });

    // Build the Rust-compatible Workflow JSON
    const workflowPayload: Workflow = {
      id: workflowId,
      name: "Local Flow", // Debería extraerse del path o metadata
      trigger: { type: "manual" },
      nodes: nodes.map(n => ({
        id: n.id,
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
      // Opcional: auto-guardar antes de ejecutar si tenemos el filePath en el state, 
      // pero por ahora solo ejecutamos.
      await invoke('cmd_execute_workflow', { workflow: workflowPayload });
    } catch (err) {
      console.error("Failed to start workflow execution", err);
      set({ isExecuting: false });
    }
  },
}));

// Setup global Tauri listeners outside of components to avoid re-renders or multiple bounds
let initializedListeners = false;
export const setupFlowListeners = async () => {
  if (initializedListeners) return;
  initializedListeners = true;

  await listen<NodeExecutionEvent>('workflow://node-status', (event) => {
    const payload = event.payload;
    // Mapeo el estado (camelCase/snake_case etc. dependencias en Rust)
    const statusStr = typeof payload.status === 'string' ? (payload.status as string).toLowerCase() as NodeStatus : 'pending';
    useFlowStore.getState().updateNodeStatus(payload.node_id, statusStr, payload.result, payload.error);
  });

  await listen<WorkflowExecutionEvent>('workflow://status', (event) => {
    const payload = event.payload;
    const statusStr = typeof payload.status === 'string' ? (payload.status as string).toLowerCase() as NodeStatus : 'pending';
    
    if (statusStr === 'success' || statusStr === 'error') {
      useFlowStore.setState({ isExecuting: false });
    }
  });
};
