import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { FluxEntry, Workspace } from '@/types/data';

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
            const workspaces: Workspace[] = await invoke('cmd_get_workspaces');
            set({ workspaces });

            const workflows: FluxEntry[] = await invoke('cmd_scan_workflows');
            set({ workflows });
        } catch (error) {
            console.error('Failed to load data', error);
        }
    },

    addWorkspace: async () => {
        try {
            const selectedPath = await open({
                directory: true,
                multiple: false,
                title: 'Seleccionar Carpeta de Workspace',
            });

            if (selectedPath && typeof selectedPath === 'string') {
                const workflows: FluxEntry[] = await invoke('cmd_add_workspace', { path: selectedPath });
                set({ workflows });
                const workspaces: Workspace[] = await invoke('cmd_get_workspaces');
                set({ workspaces });

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
            await invoke('cmd_remove_workspace', { path: workspace });
            await get().loadData();
        } catch (error) {
            console.error('Failed to remove workspace', error);
        }
    },

    deleteWorkflow: async (path) => {
        try {
            await invoke('cmd_delete_workflow', { path });
            await get().loadData();
        } catch (error) {
            console.error('Failed to delete workflow', error);
        }
    },

    resyncWorkspaces: async () => {
        try {
            const workflows: FluxEntry[] = await invoke('cmd_resync_workspaces');
            set({ workflows });
        } catch (error) {
            console.error('Failed to resync', error);
        }
    }
}));
