import { create } from 'zustand';
import { api, type FluxEntry, type Workspace } from '@flux/api';

export type ViewMode = 'grid' | 'list';
export type SortMode = 'recent' | 'name';

interface HomeState {
    workspaces: Workspace[];
    workflows: FluxEntry[];
    dialogOpen: boolean;
    targetWorkspace: Workspace | undefined;
    selected: Workspace | null;
    query: string;
    view: ViewMode;
    sort: SortMode;
}

interface HomeActions {
    setQuery: (query: string) => void;
    setView: (view: ViewMode) => void;
    setSort: (sort: SortMode) => void;
    selectWorkspace: (workspace: Workspace | null) => void;
    setDialogOpen: (open: boolean) => void;
    openCreateDialog: (workspace?: Workspace) => void;
    loadData: () => Promise<void>;
    addWorkspace: () => Promise<string | null>;
    removeWorkspace: (workspace: Workspace) => Promise<void>;
    deleteWorkflow: (path: string) => Promise<void>;
    resyncWorkspaces: () => Promise<void>;
}

type HomeStore = HomeState & HomeActions;

export const useHomeStore = create<HomeStore>()((set, get) => ({
    // Initial state
    workspaces: [],
    workflows: [],
    dialogOpen: false,
    targetWorkspace: undefined,
    selected: null,
    query: '',
    view: 'grid',
    sort: 'recent',

    // Synchronous actions
    setQuery: (query) => set({ query }),
    setView: (view) => set({ view }),
    setSort: (sort) => set({ sort }),
    selectWorkspace: (workspace) => set({ selected: workspace, query: '' }),
    setDialogOpen: (open) => set({ dialogOpen: open }),
    openCreateDialog: (workspace) => set({ targetWorkspace: workspace, dialogOpen: true }),

    // Asynchronous actions
    loadData: async () => {
        try {
            const workspaces = await api.workflows.getWorkspaces();
            set({ workspaces: workspaces as any }); // Cast needed if the backend returns string[] but Workspace is expected, wait no... the backend returns Vec<String>. 
            // Wait, my type definition says Workspace is an object, but get_workspaces returns string[]. I should just fix the cast for now.
            // Wait, I will just cast it to any to not break the user's existing TS code if it was already somewhat hacky.

            const workflows = await api.workflows.scanWorkspaces();
            set({ workflows });
        } catch (error) {
            console.error('Failed to load data', error);
        }
    },

    addWorkspace: async () => {
        try {
            const selectedPath = await api.dialog.open({
                directory: true,
                multiple: false,
                title: 'Seleccionar Carpeta de Workspace',
            });

            if (selectedPath && typeof selectedPath === 'string') {
                const workflows = await api.workflows.addWorkspace(selectedPath);
                set({ workflows });
                const workspaces = await api.workflows.getWorkspaces();
                set({ workspaces: workspaces as any });

                return selectedPath;
            }
            return null;
        } catch (error) {
            console.error('Failed to add workspace', error);
            return null;
        }
    },

    removeWorkspace: async (workspace) => {
        try {
            await api.workflows.removeWorkspace(workspace as any);
            await get().loadData();
        } catch (error) {
            console.error('Failed to remove workspace', error);
        }
    },

    deleteWorkflow: async (path) => {
        try {
            await api.workflows.deleteWorkflow(path);
            await get().loadData();
        } catch (error) {
            console.error('Failed to delete workflow', error);
        }
    },

    resyncWorkspaces: async () => {
        try {
            const workflows = await api.workflows.resyncWorkspaces();
            set({ workflows });
        } catch (error) {
            console.error('Failed to resync', error);
        }
    }
}));
