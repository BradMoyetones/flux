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
import { Trigger } from '@/types/data';

export type AppNodeData = {
  name: string;
  label: string;
  config: Record<string, any>;
  status?: NodeStatus;
  result?: any;
  error?: string;
};

export type AppNode = Node<AppNodeData>;

export interface FlowState {
  workflowId: string;
  workflowName: string;
  originalWorkflowName: string;
  description?: string;
  trigger: Trigger;
  nodes: AppNode[];
  edges: Edge[];
  isExecuting: boolean;
  
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  setTrigger: (trigger: Trigger) => void;
  setWorkflowName: (name: string) => void;
  setDescription: (desc: string) => void;
  
  // Custom Actions
  updateNodeStatus: (nodeId: string, status: NodeStatus, result?: any, error?: string) => void;
  executeWorkflow: () => Promise<void>;
  stopWorkflow: () => Promise<void>;
  hydrateExecutionState: () => Promise<void>;
  loadWorkflow: (filePath: string) => Promise<void>;
  saveWorkflow: (currentPath?: string) => Promise<string | undefined>;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  workflowId: crypto.randomUUID(),
  workflowName: "Flujo",
  originalWorkflowName: "Flujo",
  description: "",
  trigger: { type: "manual" },
  nodes: [],
  edges: [],
  isExecuting: false,

  setTrigger: (trigger: Trigger) => set({ trigger }),
  setWorkflowName: (workflowName: string) => set({ workflowName }),
  setDescription: (description: string) => set({ description }),

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
        workflowName: workflow.name || 'Sin Título',
        originalWorkflowName: workflow.name || 'Sin Título',
        description: workflow.description || "",
        trigger: workflow.trigger as Trigger ?? { type: "manual" },
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
    const state = get();
    if (!state.workflowId || state.isExecuting) return;

    set({ isExecuting: true });

    // Reset status of all nodes
    set({
      nodes: state.nodes.map(n => ({ ...n, data: { ...n.data, status: 'pending', result: undefined, error: undefined } }))
    });

    const workflowPayload = {
      id: state.workflowId,
      name: state.workflowName,
      trigger: state.trigger,
      nodes: state.nodes.map(n => ({
        id: n.id,
        name: n.data.name || n.id,
        type: n.type || 'default',
        label: n.data.label,
        config: n.data.config,
        position: n.position,
      })),
      edges: state.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
    };

    try {
      if (state.trigger.type === 'cron') {
        await invoke('cmd_schedule_workflow', { workflow: workflowPayload });
      } else {
        await invoke('cmd_execute_workflow', { workflow: workflowPayload });
      }
    } catch (err) {
      console.error("Workflow execution failed to start", err);
      set({ isExecuting: false });
    }
  },

  stopWorkflow: async () => {
    const state = get();
    if (!state.workflowId || !state.isExecuting) return;
    
    try {
      if (state.trigger.type === 'cron') {
        await invoke('cmd_unschedule_workflow', { workflowId: state.workflowId });
      }
      await invoke('cmd_stop_workflow', { workflowId: state.workflowId });
      // El backend emitirá workflow://status con Error/Cancelled y actualizaremos isExecuting en el listener
    } catch (err) {
      console.error("Failed to stop workflow", err);
    }
  },

  hydrateExecutionState: async () => {
    const state = get();
    if (!state.workflowId) return;

    try {
      const activeFlows = await invoke<{ executing: string[], scheduled: string[] }>('cmd_get_active_workflows');
      const isExecuting = activeFlows.executing.includes(state.workflowId) || activeFlows.scheduled.includes(state.workflowId);
      
      set({ isExecuting });
      if (isExecuting) {
          console.log(`[Hydration] Restored isExecuting=true for workflow ${state.workflowId}`);
      }
    } catch (err) {
      console.error("Failed to hydrate execution state", err);
    }
  },

  saveWorkflow: async (currentPath?: string): Promise<string | undefined> => {
    const state = get();
    if (!currentPath) return undefined;
    
    let pathToSave = currentPath;
    
    // Check if renamed
    if (state.workflowName !== state.originalWorkflowName) {
        try {
            pathToSave = await invoke('cmd_rename_workflow', { 
                oldPath: currentPath, 
                newName: state.workflowName 
            });
            // Update original name so subsequent saves don't rename again
            set({ originalWorkflowName: state.workflowName });
        } catch (err) {
            console.error("Failed to rename workflow", err);
            throw err;
        }
    }

    const workflowPayload = {
        id: state.workflowId,
        name: state.workflowName,
        description: state.description,
        trigger: state.trigger,
        nodes: state.nodes.map(n => ({
            id: n.id,
            name: n.data.name || n.id,
            type: n.type || 'default',
            label: n.data.label,
            config: n.data.config,
            position: n.position,
        })),
        edges: state.edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
        })),
    };

    try {
        await invoke('cmd_save_workflow', { path: pathToSave, workflow: workflowPayload });
        return pathToSave;
    } catch (e) {
        console.error("Save failed", e);
        throw e;
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
    const store = useFlowStore.getState();
    
    // Solo cambiar a false si NO es un trigger cron. 
    // Los flujos cron se quedan "Ejecutándose" (esperando su próxima iteración) hasta que se desprogramen.
    if ((statusStr === 'success' || statusStr === 'error') && store.workflowId === payload.workflow_id) {
      if (store.trigger.type !== 'cron') {
        useFlowStore.setState({ isExecuting: false });
      }
    }
  });

  await listen<{ workflow_id: string }>('workflow://started-tick', (event) => {
    const { workflow_id } = event.payload;
    const store = useFlowStore.getState();
    
    if (store.workflowId === workflow_id) {
      // Opcional: mostrar un toast o hacer reset a los nodos para la nueva corrida
      console.log(`[FlowCanvas] Cron tick started for ${workflow_id}`);
      useFlowStore.setState({
        nodes: store.nodes.map(n => ({ ...n, data: { ...n.data, status: 'pending', result: undefined, error: undefined } }))
      });
    }
  });

  await listen<{ workflow_id: string, status: string }>('workflow://scheduler-status', (event) => {
    const { workflow_id, status } = event.payload;
    const store = useFlowStore.getState();
    
    console.log(`[Scheduler] Workflow ${workflow_id} status changed to ${status}`);
    
    if (store.workflowId === workflow_id) {
      if (status === 'scheduled') {
        useFlowStore.setState({ isExecuting: true });
      } else if (status === 'unscheduled') {
        useFlowStore.setState({ isExecuting: false });
      }
    }
  });
};
