'use client';

import { memo } from 'react';
import { Folder, FolderOpen, FolderPlus, Layers } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import { cn } from '@/shared/utils/utils';
import { workspaceName } from '../../lib/format';
import { Workspace } from '@/types/data';

interface WorkspaceSidebarProps {
    workspaces: Workspace[];
    counts: Record<string, number>;
    totalCount: number;
    selected: Workspace | null;
    onSelect: (workspace: Workspace | null) => void;
}

const itemClass = (active: boolean) =>
    cn(
        'flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors',
        {
            'bg-accent font-medium text-accent-foreground': active,
            'text-muted-foreground hover:bg-accent/50 hover:text-foreground': !active,
        },
    );

export const WorkspaceSidebar = memo(function WorkspaceSidebar({
    workspaces,
    counts,
    totalCount,
    selected,
    onSelect,
}: WorkspaceSidebarProps) {
    return (
        <aside className="flex h-full w-56 shrink-0 select-none flex-col border-r border-border/60 bg-sidebar">
            <nav className="app-scroll flex-1 overflow-y-auto py-4 px-2" aria-label="Lista de workspaces">
                <button
                    type="button"
                    onClick={() => onSelect(null)}
                    aria-current={selected === null}
                    className={cn(itemClass(selected === null), 'mb-2')}
                >
                    <Layers className="size-3.5 shrink-0" />
                    <span className="flex-1 truncate">Todos los flujos</span>
                    <span className="text-[11px] tabular-nums text-muted-foreground/70">{totalCount}</span>
                </button>

                <p className="px-2 pb-1 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/60">
                    Workspaces
                </p>

                <div className="flex flex-col gap-px">
                    {workspaces.map((ws) => {
                        const active = selected === ws;
                        const Icon = active ? FolderOpen : Folder;
                        return (
                            <button
                                key={ws}
                                type="button"
                                onClick={() => onSelect(ws)}
                                aria-current={active}
                                title={ws}
                                className={itemClass(active)}
                            >
                                <Icon className="size-3.5 shrink-0" />
                                <span className="flex-1 truncate">{workspaceName(ws)}</span>
                                <span className="text-[11px] tabular-nums text-muted-foreground/70">
                                    {counts[ws] ?? 0}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            <div className="shrink-0 border-t border-border/60 p-2">
                <Button variant="ghost" size="sm" className="h-7 w-full justify-start text-xs text-muted-foreground">
                    <FolderPlus data-icon="inline-start" />
                    Vincular workspace
                </Button>
            </div>
        </aside>
    );
});
