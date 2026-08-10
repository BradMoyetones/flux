'use client';

import { memo } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/components/ui/tooltip';
import { useHomeStore } from '../../stores/home-store';
import { useHomeFilters } from '../../hooks/use-home-filters';
import { workspaceName } from '../../lib/format';

/** Compact titlebar-style header, in the spirit of a native desktop window. */
export const HomeHeader = memo(function HomeHeader() {
    const workspaces = useHomeStore((state) => state.workspaces);
    const workflows = useHomeStore((state) => state.workflows);
    const openCreateDialog = useHomeStore((state) => state.openCreateDialog);
    const resyncWorkspaces = useHomeStore((state) => state.resyncWorkspaces);
    
    const { selected, filtered } = useHomeFilters();
    
    const title = selected === null ? 'Todos los flujos' : workspaceName(selected);
    const subtitle =
        selected === null
            ? `${workflows.length} flujos · ${workspaces.length} workspaces`
            : `${filtered.length} ${filtered.length === 1 ? 'flujo' : 'flujos'}`;

    return (
        <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border/60 px-4">
            <div className="flex min-w-0 items-baseline gap-2.5">
                <h1 className="truncate text-sm font-semibold tracking-tight">{title}</h1>
                <p className="truncate text-[11px] text-muted-foreground" title={subtitle}>
                    {subtitle}
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon-sm" onClick={resyncWorkspaces}>
                            <RefreshCw />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh</TooltipContent>
                </Tooltip>
                <Button size="sm" onClick={() => openCreateDialog(selected ?? undefined)}>
                    <Plus />
                    Nuevo flujo
                </Button>
            </div>
        </header>
    );
});
