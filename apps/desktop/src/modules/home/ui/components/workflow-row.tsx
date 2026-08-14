'use client';

import { memo, useState } from 'react';
import { Trash2, Workflow } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import { FluxEntry } from '@/types/data';
import { useHomeStore } from '../../stores/home-store';
import { useTabs } from '@/shared/contexts/tabs-context';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Spinner } from '@/ui/components/ui/spinner';

/** Dense row used in list view. Memoized: only re-renders when the flow changes. */
export const WorkflowRow = memo(function WorkflowRow({ flow }: { flow: FluxEntry }) {
    const deleteWorkflow = useHomeStore((state) => state.deleteWorkflow);
    const { openTab } = useTabs();
    const navigate = useNavigate();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleOpen = () => {
        const routePath = `/flows/${encodeURIComponent(flow.path)}`;
        const openedPath = openTab(routePath);
        navigate(openedPath);
    };

    return (
        <div className="group relative flex h-9 items-center gap-2.5 rounded-md px-2 transition-colors hover:bg-accent/60">
            <Workflow className="size-4 shrink-0 text-primary" />

            <button type="button" className="min-w-0 flex-1 text-left outline-none" title={flow.path} onClick={handleOpen}>
                <span className="absolute inset-0 rounded-md" aria-hidden="true" />
                <span className="block truncate text-[13px] font-medium">{flow.name}</span>
            </button>

            <span className="hidden min-w-0 max-w-[40%] shrink truncate text-[11px] text-muted-foreground md:block">
                {flow.path}
            </span>

            {/* <span className="w-20 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                <RelativeTime iso={flow.} />
            </span> */}

            <Button
                variant="destructive"
                size="icon-sm"
                aria-label={`Eliminar ${flow.name}`}
                className="relative z-10 size-6 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                onClick={(e) => {
                    e.stopPropagation();
                    toast(`¿Seguro quieres eliminar el flujo ${flow.name}?`, {
                        action: {
                            label: 'Eliminar',
                            onClick: async () => {
                                setIsDeleting(true);
                                await deleteWorkflow(flow.path);
                                setIsDeleting(false);
                            }
                        }
                    })
                }}
            >
                {!isDeleting ? (
                    <Trash2 />
                ) : (
                    <Spinner />
                )}
            </Button>
        </div>
    );
});
