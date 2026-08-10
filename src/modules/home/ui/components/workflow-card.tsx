'use client';

import { memo } from 'react';
import { Trash2, Workflow } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import { FluxEntry } from '@/types/data';

/** Compact card used in grid view. Memoized: only re-renders when the flow changes. */
export const WorkflowCard = memo(function WorkflowCard({ flow }: { flow: FluxEntry }) {
    return (
        <div className="group relative flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3 transition-colors hover:border-border hover:bg-accent/50">
            <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <Workflow className="size-4" />
            </div>

            <div className="min-w-0 flex-1">
                <button type="button" className="text-left outline-none" title={flow.path}>
                    <span className="absolute inset-0 rounded-lg" aria-hidden="true" />
                    <h3 className="truncate text-[13px] leading-5 font-medium">{flow.name}</h3>
                </button>
                <p className="truncate text-[11px] text-muted-foreground" title={flow.path}>
                    {flow.path}
                </p>
                {/* <p className="mt-1.5 text-[11px] text-muted-foreground/70">
                    Editado <RelativeTime iso={flow.updatedAt} />
                </p> */}
            </div>

            <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Eliminar ${flow.name}`}
                className="relative z-10 -mt-0.5 -mr-1 shrink-0 text-muted-foreground opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:text-destructive"
            >
                <Trash2 />
            </Button>
        </div>
    );
});
