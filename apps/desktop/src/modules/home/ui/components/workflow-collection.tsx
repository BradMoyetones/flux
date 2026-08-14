'use client';

import { memo } from 'react';
import { workspaceName } from '@/modules/home/lib/format';
import { WorkflowCard } from './workflow-card';
import { WorkflowRow } from './workflow-row';
import { FluxEntry } from '@/types/data';
import { useHomeStore } from '../../stores/home-store';

/** Renders a set of workflows in either grid or list mode. */
export const WorkflowCollection = memo(function WorkflowCollection({
    flows,
}: {
    flows: FluxEntry[];
}) {
    const view = useHomeStore((state) => state.view);

    if (view === 'grid') {
        return (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-2.5">
                {flows.map((f) => (
                    <WorkflowCard key={f.path} flow={f} />
                ))}
            </div>
        );
    }
    return (
        <div className="flex flex-col">
            {flows.map((f) => (
                <WorkflowRow key={f.path} flow={f} />
            ))}
        </div>
    );
});

/** Grouped-by-workspace sections used in the "Todos los flujos" view. */
export const WorkflowGroups = memo(function WorkflowGroups({
    groups,
}: {
    groups: [string, FluxEntry[]][];
}) {
    return (
        <div className="flex flex-col gap-6">
            {groups.map(([ws, flows]) => (
                <section key={ws}>
                    <div className="mb-2 flex items-baseline gap-2">
                        <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                            {workspaceName(ws)}
                        </h2>
                        <span className="text-[11px] tabular-nums text-muted-foreground/60">{flows.length}</span>
                    </div>
                    <WorkflowCollection flows={flows} />
                </section>
            ))}
        </div>
    );
});
