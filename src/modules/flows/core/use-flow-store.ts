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
}

export const useFlowStore = create<FlowState>((set, get) => ({
  workflowId: crypto.randomUUID(),
  nodes: [],
  edges: [],
  isExecuting: false,

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
      name: "Local Flow",
      trigger: { type: "manual" },
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type || 'default',
        label: n.data.label,
        config: n.data.config,
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
