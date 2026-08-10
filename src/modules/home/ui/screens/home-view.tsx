import { useEffect, useState, useRef } from 'react';
import { useTabs } from '@/shared/contexts/tabs-context';
import { useNavigate } from 'react-router';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { CreateFlowDialog } from '../components/create-flow-dialog';
import { FluxEntry, Workspace } from '@/types/data';
import { WorkspaceSidebar } from '../components/workspace-sidebar';
import { HomeHeader } from '../components/home-header';
import { HomeToolbar } from '../components/home-toolbar';
import { cn } from '@/shared/utils/utils';
import { useHomeFilters } from '../../hooks/use-home-filters';
import { HomeEmptyState } from '../components/home-empty-state';
import { WorkflowCollection, WorkflowGroups } from '../components/workflow-collection';
import { workspaceName } from '../../lib/format';

export function HomeView() {
    const { openTab } = useTabs();
    const navigate = useNavigate();

    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [workflows, setWorkflows] = useState<FluxEntry[]>([]);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [targetWorkspace, setTargetWorkspace] = useState<Workspace | undefined>(undefined);

    const loadData = async () => {
        try {
            const wks: Workspace[] = await invoke('cmd_get_workspaces');
            setWorkspaces(wks);

            const flows: FluxEntry[] = await invoke('cmd_scan_workflows');
            setWorkflows(flows);
        } catch (error) {
            console.error('Failed to load data', error);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOpenTab = (absolutePath: string) => {
        const routePath = `/flows/${encodeURIComponent(absolutePath)}`;
        const openedPath = openTab(routePath);
        navigate(openedPath);
    };

    const handleAddWorkspace = async () => {
        const selectedPath = await open({
            directory: true,
            multiple: false,
            title: 'Seleccionar Carpeta de Workspace',
        });

        if (selectedPath && typeof selectedPath === 'string') {
            // cmd_add_workspace ahora escanea e indexa automáticamente
            const updatedIndex: FluxEntry[] = await invoke('cmd_add_workspace', { path: selectedPath });
            setWorkflows(updatedIndex);
            const wks: Workspace[] = await invoke('cmd_get_workspaces');
            setWorkspaces(wks);

            return selectedPath;
        }
        return null;
    };

    const handleRemoveWorkspace = async (workspace: Workspace) => {
        await invoke('cmd_remove_workspace', { path: workspace });
        await loadData();
    };

    const handleDeleteWorkflow = async (e: React.MouseEvent, path: string) => {
        e.stopPropagation();
        try {
            await invoke('cmd_delete_workflow', { path });
            await loadData();
        } catch (error) {
            console.error('Failed to delete workflow', error);
        }
    };

    const handleResync = async () => {
        try {
            const flows: FluxEntry[] = await invoke('cmd_resync_workspaces');
            setWorkflows(flows);
        } catch (error) {
            console.error('Failed to resync', error);
        }
    };

    const openCreateDialog = (workspace?: Workspace) => {
        setTargetWorkspace(workspace);
        setDialogOpen(true);
    };

    const {
        selected,
        query,
        view,
        sort,
        counts,
        filtered,
        grouped,
        isStale,
        setQuery,
        setView,
        setSort,
        selectWorkspace,
        setWorkflows: setWorkflowsFromFilters,
    } = useHomeFilters();

    useEffect(() => {
        setWorkflowsFromFilters(workflows);
    }, [workflows, setWorkflowsFromFilters]);

    const searchRef = useRef<HTMLInputElement>(null);

    // Keyboard: "/" or Cmd/Ctrl+K focuses search.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
            if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const title = selected === null ? 'Todos los flujos' : workspaceName(selected);
    const subtitle =
        selected === null
            ? `${workflows.length} flujos · ${workspaces.length} workspaces`
            : `${filtered.length} ${filtered.length === 1 ? 'flujo' : 'flujos'}`;

    return (
        <div className="flex h-full w-full cursor-default overflow-hidden overscroll-none text-foreground">
            <WorkspaceSidebar
                workspaces={workspaces}
                counts={counts}
                totalCount={workflows.length}
                selected={selected}
                onSelect={selectWorkspace}
            />

            <main className="flex min-w-0 flex-1 flex-col">
                <HomeHeader title={title} subtitle={subtitle} onNewFlow={() => openCreateDialog(selected ?? undefined)} />
                <HomeToolbar
                    query={query}
                    onQueryChange={setQuery}
                    searchRef={searchRef}
                    sort={sort}
                    onSortChange={setSort}
                    view={view}
                    onViewChange={setView}
                />

                <div
                    className={cn(
                        'app-scroll flex-1 overflow-y-auto px-4 py-4 transition-opacity',
                        isStale && 'opacity-60'
                    )}
                >
                    {filtered.length === 0 ? (
                        <HomeEmptyState query={query} />
                    ) : grouped ? (
                        <WorkflowGroups groups={grouped} view={view} />
                    ) : (
                        <WorkflowCollection flows={filtered} view={view} />
                    )}
                </div>
            </main>
            <CreateFlowDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                workspaces={workspaces}
                defaultWorkspace={targetWorkspace}
                onCreated={(path) => {
                    loadData();
                    handleOpenTab(path);
                }}
                onAddWorkspace={handleAddWorkspace}
            />
        </div>
    );
}
