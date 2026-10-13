import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { getDefaultStore } from 'jotai';
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

import { FLOW_ROUTE_PATTERN, resolveRoute } from '@/shared/router/route-meta';
import { useTabId } from '@/shared/state/tab-context';
import { onTabClosed, tabsAtom } from '@/shared/state/tabs';

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

  /** El documento ya se cargó desde disco. */
  loaded: boolean;
  /** Error al cargar (archivo borrado, ilegible, fuera del workspace…). */
  loadError?: string;
  /** Huella del documento tal como está en disco. `snapshotOf(estado) !== savedSnapshot` ⇒ hay cambios sin guardar. */
  savedSnapshot: string;

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
  /** Carga el workflow. Es idempotente: si ya está cargado ese path no hace nada (salvo `force`). */
  loadWorkflow: (filePath: string, options?: { force?: boolean }) => Promise<void>;
  saveWorkflow: (currentPath?: string) => Promise<string | undefined>;
}

export type FlowStoreApi = StoreApi<FlowState>;

// ─────────────────────────────────────────────────────────────────────────────
// Documento ↔ estado, huella (dirty) y borradores
// ─────────────────────────────────────────────────────────────────────────────

interface FlowDoc {
  name: string;
  description: string;
  trigger: Trigger;
  nodes: { id: string; type: string; name: string; label: string; config: Record<string, any>; position: { x: number; y: number } }[];
  edges: { id: string; source: string; target: string; sourceHandle: string | null; targetHandle: string | null }[];
}

function stateToDoc(s: Pick<FlowState, 'workflowName' | 'description' | 'trigger' | 'nodes' | 'edges'>): FlowDoc {
  return {
    name: s.workflowName,
    description: s.description ?? '',
    trigger: s.trigger,
    nodes: s.nodes.map((n) => ({
      id: n.id,
      type: n.type || 'default',
      name: n.data.name || n.id,
      label: n.data.label,
      config: n.data.config,
      position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
    })),
    edges: s.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
    })),
  };
}

function docToState(doc: FlowDoc): Pick<FlowState, 'workflowName' | 'description' | 'trigger' | 'nodes' | 'edges'> {
  return {
    workflowName: doc.name,
    description: doc.description,
    trigger: doc.trigger,
    nodes: doc.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: { name: n.name, label: n.label, config: n.config },
    })),
    edges: doc.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
  };
}

function workflowToDoc(workflow: Workflow): FlowDoc {
  return {
    name: workflow.name || 'Sin Título',
    description: workflow.description || '',
    trigger: (workflow.trigger as Trigger) ?? { type: 'manual' },
    nodes: workflow.nodes.map((n, index) => ({
      id: n.id,
      type: n.type || 'http', // Default to http for now
      name: (n as any).name || `node_${index + 1}`,
      label: n.label || 'Node',
      config: n.config || {},
      position: n.position || { x: 200, y: index * 150 },
    })),
    edges: workflow.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
    })),
  };
}

/** Huella estable del documento (sin estado de ejecución ni selección). */
export function snapshotOf(s: Pick<FlowState, 'workflowName' | 'description' | 'trigger' | 'nodes' | 'edges'>): string {
  return JSON.stringify(stateToDoc(s));
}

function buildWorkflow(s: FlowState, path: string | undefined): Workflow {
  return {
    id: s.workflowId,
    name: s.workflowName,
    description: s.description,
    path,
    metadata: s.metadata,
    trigger: s.trigger,
    nodes: s.nodes.map((n) => ({
      id: n.id,
      name: n.data.name || n.id,
      type: n.type || 'default',
      label: n.data.label,
      config: n.data.config,
      position: n.position,
    })),
    edges: s.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
  };
}

// Borradores: los cambios sin guardar sobreviven a un reinicio de la app. Solo se
// restauran si el archivo en disco sigue igual que cuando se escribió el borrador.
const DRAFT_PREFIX = 'flux.draft.v1:';
const DRAFT_DEBOUNCE_MS = 600;

interface Draft { base: string; doc: FlowDoc }

function readDraft(path: string): Draft | undefined {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + path);
    if (!raw) return undefined;
    const draft = JSON.parse(raw) as Draft;
    return typeof draft?.base === 'string' && draft.doc ? draft : undefined;
  } catch {
    return undefined;
  }
}

function writeDraft(path: string, draft: Draft) {
  try { localStorage.setItem(DRAFT_PREFIX + path, JSON.stringify(draft)); } catch { /* cuota llena: se ignora */ }
}

function removeDraft(path: string | undefined) {
  if (!path) return;
  try { localStorage.removeItem(DRAFT_PREFIX + path); } catch { /* noop */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Un store por TAB (no un singleton global)
// ─────────────────────────────────────────────────────────────────────────────

function createFlowStore(enableDrafts: boolean): { store: FlowStoreApi; dispose: () => void } {
  const store = createStore<FlowState>((set, get) => ({
    workflowId: crypto.randomUUID(),
    workflowName: "Flujo",
    originalWorkflowName: "Flujo",
    description: "",
    trigger: { type: "manual" },
    nodes: [],
    edges: [],
    isExecuting: false,
    loaded: false,
    savedSnapshot: '',

    setTrigger: (trigger: Trigger) => set({ trigger }),
    setWorkflowName: (workflowName: string) => set({ workflowName }),
    setDescription: (description: string) => set({ description }),

    loadWorkflow: async (filePath: string, options) => {
      const current = get();
      if (!options?.force && current.loaded && current.workflowPath === filePath) return;

      set({ loadError: undefined });
      try {
        const workflow: Workflow = await api.workflows.getWorkflow(filePath);
        const doc = workflowToDoc(workflow);

        set({
          ...docToState(doc),
          workflowId: workflow.id,
          workflowPath: filePath,
          originalWorkflowName: doc.name,
          metadata: workflow.metadata,
          loaded: true,
        });
        const base = snapshotOf(get());
        set({ savedSnapshot: base });

        // ¿Había cambios sin guardar de una sesión anterior? Solo valen si el archivo no cambió.
        if (enableDrafts) {
          const draft = readDraft(filePath);
          if (draft && draft.base === base) {
            const restored = docToState(draft.doc);
            if (snapshotOf(restored) !== base) {
              set(restored);
              toast.info('Se restauraron cambios sin guardar', { description: doc.name });
            }
          } else if (draft) {
            removeDraft(filePath);
          }
        }
      } catch (err) {
        console.error("Failed to load workflow", err);
        set({ loadError: errorMessage(err), loaded: false });
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

      const workflowPayload = buildWorkflow(state, state.workflowPath);

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
      } catch (err) {
        console.error("Failed to hydrate execution state", err);
      }
    },

    saveWorkflow: async (currentPath?: string): Promise<string | undefined> => {
      const state = get();
      const startPath = currentPath ?? state.workflowPath;
      if (!startPath) return undefined;

      let pathToSave = startPath;

      // Check if renamed
      if (state.workflowName !== state.originalWorkflowName) {
        try {
          pathToSave = await api.workflows.renameWorkflow(startPath, state.workflowName);
          // Update original name so subsequent saves don't rename again
          set({ originalWorkflowName: state.workflowName });
        } catch (err) {
          console.error("Failed to rename workflow", err);
          throw err;
        }
      }

      try {
        await api.workflows.saveWorkflow(pathToSave, buildWorkflow(get(), pathToSave));
        removeDraft(startPath);
        removeDraft(pathToSave);
        set({ workflowPath: pathToSave, savedSnapshot: snapshotOf(get()) });
        return pathToSave;
      } catch (e) {
        console.error("Save failed", e);
        throw e;
      }
    },
  }));

  // Borrador (debounced): guarda los cambios sin guardar; lo borra cuando vuelve a coincidir con disco.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsubscribe = enableDrafts
    ? store.subscribe((state) => {
        if (!state.loaded || !state.workflowPath) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          const s = store.getState();
          if (!s.loaded || !s.workflowPath) return;
          if (snapshotOf(s) === s.savedSnapshot) removeDraft(s.workflowPath);
          else writeDraft(s.workflowPath, { base: s.savedSnapshot, doc: stateToDoc(s) });
        }, DRAFT_DEBOUNCE_MS);
      })
    : () => {};

  return {
    store,
    dispose: () => {
      clearTimeout(timer);
      unsubscribe();
      // Cerrar el tab = descartar los cambios sin guardar.
      removeDraft(store.getState().workflowPath);
    },
  };
}

// ─── Registro (tabId → store) ───

const flowStores = new Map<string, { store: FlowStoreApi; dispose: () => void }>();

function isFlowTab(tabId: string): boolean {
  const tab = getDefaultStore().get(tabsAtom).find((t) => t.id === tabId);
  return !!tab && resolveRoute(tab.path)?.meta.pattern === FLOW_ROUTE_PATTERN;
}

/** Store del flujo de un tab (se crea al primer acceso). */
export function getFlowStore(tabId: string): FlowStoreApi {
  let entry = flowStores.get(tabId);
  if (!entry) {
    entry = createFlowStore(isFlowTab(tabId));
    flowStores.set(tabId, entry);
  }
  return entry.store;
}

// Al cerrar un tab se libera su store.
onTabClosed((tabId) => {
  flowStores.get(tabId)?.dispose();
  flowStores.delete(tabId);
});

/** ¿El tab tiene cambios sin guardar? (no crea el store si no existe) */
export function isFlowTabDirty(tabId: string): boolean {
  const entry = flowStores.get(tabId);
  if (!entry) return false;
  const s = entry.store.getState();
  return s.loaded && snapshotOf(s) !== s.savedSnapshot;
}

/** Store del tab actual (para usar en `useEffect`/handlers sin suscribirse). */
export function useFlowStoreApi(): FlowStoreApi {
  return getFlowStore(useTabId());
}

/** Estado del flujo del tab actual. Admite selector. */
export function useFlowStore(): FlowState;
export function useFlowStore<T>(selector: (state: FlowState) => T): T;
export function useFlowStore<T>(selector?: (state: FlowState) => T) {
  const api = useFlowStoreApi();
  return useStore(api, selector ?? ((s: FlowState) => s as unknown as T));
}

/** `true` si el flujo de ese tab tiene cambios sin guardar (para el indicador del tab). */
export function useFlowDirty(tabId: string): boolean {
  return useStore(getFlowStore(tabId), (s) => s.loaded && snapshotOf(s) !== s.savedSnapshot);
}

/** Aplica `fn` a todos los stores que tienen cargado ese workflow (aunque su tab esté en segundo plano). */
function forEachStoreOf(workflowId: string, fn: (store: FlowStoreApi) => void) {
  for (const { store } of flowStores.values()) {
    if (store.getState().workflowId === workflowId) fn(store);
  }
}

// Setup global Tauri listeners outside of components to avoid re-renders or multiple bounds
let initializedListeners = false;
export const setupFlowListeners = async () => {
  if (initializedListeners) return;
  initializedListeners = true;

  await api.events.listen<NodeExecutionEvent>('workflow://node-status', (event) => {
    const payload = event.payload;
    const statusStr = typeof payload.status === 'string' ? (payload.status as string).toLowerCase() as NodeStatus : 'pending';
    forEachStoreOf(payload.workflow_id, (store) =>
      store.getState().updateNodeStatus(payload.node_id, statusStr, payload.result, payload.error));
  });

  await api.events.listen<WorkflowExecutionEvent>('workflow://status', (event) => {
    const payload = event.payload;
    const statusStr = typeof payload.status === 'string' ? (payload.status as string).toLowerCase() as NodeStatus : 'pending';

    // Solo cambiar a false si NO es un trigger cron.
    // Los flujos cron se quedan "Ejecutándose" (esperando su próxima iteración) hasta que se desprogramen.
    if (statusStr === 'success' || statusStr === 'error' || statusStr === 'cancelled') {
      forEachStoreOf(payload.workflow_id, (store) => {
        if (store.getState().trigger.type !== 'cron') store.setState({ isExecuting: false });
      });
    }
  });

  await api.events.listen<{ workflow_id: string }>('workflow://started-tick', (event) => {
    forEachStoreOf(event.payload.workflow_id, (store) => {
      store.setState({
        nodes: store.getState().nodes.map(n => ({ ...n, data: { ...n.data, status: 'pending', result: undefined, error: undefined } }))
      });
    });
  });

  await api.events.listen<{ workflow_id: string, status: SchedulerStatus }>('workflow://scheduler-status', (event) => {
    const { workflow_id, status } = event.payload;

    forEachStoreOf(workflow_id, (store) => store.setState({ isExecuting: status === 'scheduled' }));

    if (status === 'expired') toast.info('El flujo programado expiró', { description: 'Llegó su fecha de expiración y se desprogramó.' });
    if (status === 'completed') toast.info('El flujo programado terminó', { description: 'Alcanzó su máximo de ejecuciones y se desprogramó.' });
  });

  await api.events.listen<{ path: string, metadata: WorkflowMetadata }>('workflow://metadata-updated', (event) => {
    const { path, metadata } = event.payload;
    for (const { store } of flowStores.values()) {
      if (store.getState().workflowPath === path) store.setState({ metadata });
    }
  });
};
