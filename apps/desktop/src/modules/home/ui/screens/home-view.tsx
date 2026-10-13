import { useEffect } from 'react';
import { CreateFlowDialog } from '../components/create-flow-dialog';
import { WorkspaceSidebar } from '../components/workspace-sidebar';
import { HomeHeader } from '../components/home-header';
import { HomeToolbar } from '../components/home-toolbar';
import { cn } from '@/shared/utils/utils';
import { useHomeFilters } from '../../hooks/use-home-filters';
import { HomeEmptyState } from '../components/home-empty-state';
import { WorkflowCollection, WorkflowGroups } from '../components/workflow-collection';
import { useHomeStore } from '../../stores/home-store';

export function HomeView() {
    const loadData = useHomeStore((state) => state.loadData);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const {
        filtered,
        grouped,
        isStale,
        query,
    } = useHomeFilters();

    return (
        <div className="flex h-full w-full cursor-default overflow-hidden overscroll-none text-foreground">
            <WorkspaceSidebar />

            <main className="flex min-w-0 flex-1 flex-col">
                <HomeHeader />
                <HomeToolbar />

                <div
                    className={cn(
                        'flex-1 overflow-y-auto px-4 py-4 transition-opacity',
                        isStale && 'opacity-60'
                    )}
                >
                    {filtered.length === 0 ? (
                        <HomeEmptyState query={query} />
                    ) : grouped ? (
                        <WorkflowGroups groups={grouped} />
                    ) : (
                        <WorkflowCollection flows={filtered} />
                    )}
                </div>
            </main>
            <CreateFlowDialog />
        </div>
    );
}
