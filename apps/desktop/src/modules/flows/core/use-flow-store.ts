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
import { toast } from 'sonner';
import {
  api,
  type NodeExecutionEvent,
  type WorkflowExecutionEvent,
  type NodeStatus,
  type Workflow,
  type Trigger,
  type SchedulerStatus,
  type WorkflowMetadata
} from '@flux/api';

/** Los errores del backend llegan como `{ code, category, message }` (AppError) o como string. */
function errorMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return 'Error desconocido';
}

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
  workflowPath?: string;
  originalWorkflowName: string;
  description?: string;
  metadata?: WorkflowMetadata;
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
      const workflow: Workflow = await api.workflows.getWorkflow(filePath);
      
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
        workflowPath: filePath,
        originalWorkflowName: workflow.name || 'Sin Título',
        description: workflow.description || "",
        metadata: workflow.metadata,
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

    const workflowPayload: Workflow = {
      id: state.workflowId,
      name: state.workflowName,
      description: state.description,
      path: state.workflowPath,
      metadata: state.metadata,
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
        await api.scheduler.scheduleWorkflow(workflowPayload);
      } else {
        await api.execution.executeWorkflow(workflowPayload);
      }
    } catch (err) {
      console.error("Workflow execution failed to start", err);
      set({
        isExecuting: false,
        nodes: get().nodes.map(n => ({ ...n, data: { ...n.data, status: undefined } })),
      });
      toast.error(
        state.trigger.type === 'cron' ? 'No se pudo programar el flujo' : 'No se pudo ejecutar el flujo',
        { description: errorMessage(err) },
      );
    }
  },

  stopWorkflow: async () => {
    const state = get();
    if (!state.workflowId || !state.isExecuting) return;
    
    try {
      if (state.trigger.type === 'cron') {
        await api.scheduler.unscheduleWorkflow(state.workflowId);
      }
      await api.execution.stopWorkflow(state.workflowId);
      // El backend emite workflow://status (cancelled) y los nodos pendientes pasan a 'cancelled'.
    } catch (err) {
      console.error("Failed to stop workflow", err);
      toast.error('No se pudo detener el flujo', { description: errorMessage(err) });
    }
  },

  hydrateExecutionState: async () => {
    const state = get();
    if (!state.workflowId) return;

    try {
      const activeFlows = await api.execution.getActiveWorkflows();
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
            pathToSave = await api.workflows.renameWorkflow(
                currentPath, 
                state.workflowName 
            );
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
        path: pathToSave,
        metadata: state.metadata,
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
        await api.workflows.saveWorkflow(pathToSave, workflowPayload as any);
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

  await api.events.listen<NodeExecutionEvent>('workflow://node-status', (event) => {
    const payload = event.payload;
    // Mapeo el estado (camelCase/snake_case etc. dependencias en Rust)
    const statusStr = typeof payload.status === 'string' ? (payload.status as string).toLowerCase() as NodeStatus : 'pending';
    useFlowStore.getState().updateNodeStatus(payload.node_id, statusStr, payload.result, payload.error);
  });

  await api.events.listen<WorkflowExecutionEvent>('workflow://status', (event) => {
    const payload = event.payload;
    const statusStr = typeof payload.status === 'string' ? (payload.status as string).toLowerCase() as NodeStatus : 'pending';
    const store = useFlowStore.getState();
    
    // Solo cambiar a false si NO es un trigger cron. 
    // Los flujos cron se quedan "Ejecutándose" (esperando su próxima iteración) hasta que se desprogramen.
    if ((statusStr === 'success' || statusStr === 'error' || statusStr === 'cancelled') && store.workflowId === payload.workflow_id) {
      if (store.trigger.type !== 'cron') {
        useFlowStore.setState({ isExecuting: false });
      }
    }
  });

  await api.events.listen<{ workflow_id: string }>('workflow://started-tick', (event) => {
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

  await api.events.listen<{ workflow_id: string, status: SchedulerStatus }>('workflow://scheduler-status', (event) => {
    const { workflow_id, status } = event.payload;
    const store = useFlowStore.getState();

    if (store.workflowId !== workflow_id) return;

    if (status === 'scheduled') {
      useFlowStore.setState({ isExecuting: true });
    } else {
      // unscheduled | expired | completed → el flujo ya no está programado
      useFlowStore.setState({ isExecuting: false });
      if (status === 'expired') toast.info('El flujo programado expiró', { description: 'Llegó su fecha de expiración y se desprogramó.' });
      if (status === 'completed') toast.info('El flujo programado terminó', { description: 'Alcanzó su máximo de ejecuciones y se desprogramó.' });
    }
  });

  await api.events.listen<{ path: string, metadata: WorkflowMetadata }>('workflow://metadata-updated', (event) => {
    const { path, metadata } = event.payload;
    // Solo si es el flujo que está cargado en el editor (el evento es global).
    if (useFlowStore.getState().workflowPath === path) {
      useFlowStore.setState({ metadata });
    }
  });
};
