'use client';

import { FluxEntry, Workspace } from '@/types/data';
import { useCallback, useDeferredValue, useMemo, useState } from 'react';

export type ViewMode = 'grid' | 'list';
export type SortMode = 'recent' | 'name';

export function useHomeFilters() {
    const [selected, setSelected] = useState<Workspace | null>(null);
    const [query, setQuery] = useState('');
    const [view, setView] = useState<ViewMode>('grid');
    const [sort, setSort] = useState<SortMode>('recent');
    const [workflows, setWorkflows] = useState<FluxEntry[]>([]);

    // Defer filtering so typing stays responsive with large collections.
    const deferredQuery = useDeferredValue(query);

    const counts = useMemo(() => {
        const c: Record<string, number> = {};
        for (const f of workflows) c[f.workspace] = (c[f.workspace] ?? 0) + 1;
        return c;
    }, [workflows]);

    const filtered = useMemo(() => {
        const q = deferredQuery.trim().toLowerCase();
        const result = workflows.filter((f) => {
            if (selected !== null && f.workspace !== selected) return false;
            if (!q) return true;
            return f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q);
        });
        if (sort === 'name') {
            result.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        } 
        // else {
        //     result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        // }
        return result;
    }, [deferredQuery, selected, sort, workflows]);

    // When viewing "all", group results by workspace for readability.
    const grouped = useMemo(() => {
        if (selected !== null) return null;
        const map = new Map<string, FluxEntry[]>();
        for (const f of filtered) {
            const bucket = map.get(f.workspace);
            if (bucket) bucket.push(f);
            else map.set(f.workspace, [f]);
        }
        return Array.from(map.entries());
    }, [filtered, selected]);

    const selectWorkspace = useCallback((workspace: Workspace | null) => {
        setSelected(workspace);
        setQuery('');
    }, []);

    return {
        selected,
        query,
        view,
        sort,
        counts,
        filtered,
        grouped,
        isStale: query !== deferredQuery,
        setQuery,
        setView,
        setSort,
        selectWorkspace,
        setWorkflows,
    };
}
