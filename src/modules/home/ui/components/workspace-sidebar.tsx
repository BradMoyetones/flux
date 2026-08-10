'use client';

import { memo, useState } from 'react';
import { Ellipsis, Folder, FolderOpen, FolderPlus, Layers, Trash2 } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import { cn } from '@/shared/utils/utils';
import { workspaceName } from '../../lib/format';
import { useHomeStore } from '../../stores/home-store';
import { useHomeFilters } from '../../hooks/use-home-filters';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu"
import { Spinner } from '@/ui/components/ui/spinner';

const itemClass = (active: boolean) =>
    cn(
        'flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors group',
        {
            'bg-accent font-medium text-accent-foreground': active,
            'text-muted-foreground hover:bg-accent/50 hover:text-foreground': !active,
        },
    );

export const WorkspaceSidebar = memo(function WorkspaceSidebar() {
    const workspaces = useHomeStore((state) => state.workspaces);
    const totalCount = useHomeStore((state) => state.workflows.length);
    const addWorkspace = useHomeStore((state) => state.addWorkspace);
    const removeWorkspace = useHomeStore((state) => state.removeWorkspace);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    const { counts, selected, selectWorkspace } = useHomeFilters();

    const handleAddWorkspace = async () => {
        setIsAdding(true);
        await addWorkspace();
        setIsAdding(false);
    };
    return (
        <aside className="flex h-full w-56 shrink-0 select-none flex-col border-r border-border/60 bg-sidebar">
            <nav className="app-scroll flex-1 overflow-y-auto py-4 px-2" aria-label="Lista de workspaces">
                <button
                    type="button"
                    onClick={() => selectWorkspace(null)}
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
                                onClick={() => selectWorkspace(ws)}
                                aria-current={active}
                                title={ws}
                                className={itemClass(active)}
                            >
                                <Icon className="size-3.5 shrink-0" />
                                <span className="flex-1 truncate">{workspaceName(ws)}</span>
                                <span className={cn("text-[11px] tabular-nums text-muted-foreground/70 group-hover:hidden", {
                                    'hidden': activeDropdown === ws
                                })}>
                                    {counts[ws] ?? 0}
                                </span>

                                <DropdownMenu open={activeDropdown === ws} onOpenChange={(open) => setActiveDropdown(open ? ws : null)}>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            className={cn('hidden group-hover:flex translate-x-2', {
                                                'flex': activeDropdown === ws
                                            })}
                                            variant={"ghost"}
                                            size={"icon-xs"}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Ellipsis />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuGroup>
                                            <DropdownMenuLabel>{workspaceName(ws)}</DropdownMenuLabel>
                                            <DropdownMenuItem
                                                variant='destructive'
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toast('¿Seguro que deseas eliminar este workspace?', {
                                                        description: 'Por seguridad los Workflows asociados a este workspace no serán eliminados.',
                                                        action: {
                                                            label: 'Eliminar',
                                                            onClick: async () => {
                                                                setIsDeleting(true);
                                                                toast.promise(removeWorkspace(ws), {
                                                                    loading: 'Eliminando workspace...',
                                                                    success: 'Workspace eliminado exitosamente!',
                                                                    error: 'Error al eliminar workspace'
                                                                });
                                                                setIsDeleting(false);
                                                            }
                                                        }
                                                    })
                                                }}
                                                disabled={isDeleting}
                                            >
                                                {
                                                    isDeleting ? (
                                                        <Spinner />
                                                    ) : (
                                                        <Trash2 />
                                                    )
                                                }
                                                Eliminar
                                            </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>


                            </button>
                        );
                    })}
                </div>
            </nav>

            <div className="shrink-0 border-t border-border/60 p-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs text-muted-foreground"
                    onClick={() => handleAddWorkspace()}
                    disabled={isAdding}
                >
                    <FolderPlus data-icon="inline-start" />
                    Vincular workspace
                    {isAdding && <Spinner className='ml-auto' />}
                </Button>
            </div>
        </aside>
    );
});
