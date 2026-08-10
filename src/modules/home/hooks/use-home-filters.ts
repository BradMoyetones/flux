'use client';

import { FluxEntry } from '@/types/data';
import { useDeferredValue, useMemo } from 'react';
import { useHomeStore, ViewMode, SortMode } from '../stores/home-store';

export type { ViewMode, SortMode };

export function useHomeFilters() {
    const selected = useHomeStore((state) => state.selected);
    const query = useHomeStore((state) => state.query);
    const view = useHomeStore((state) => state.view);
    const sort = useHomeStore((state) => state.sort);
    const workflows = useHomeStore((state) => state.workflows);
    
    const setQuery = useHomeStore((state) => state.setQuery);
    const setView = useHomeStore((state) => state.setView);
    const setSort = useHomeStore((state) => state.setSort);
    const selectWorkspace = useHomeStore((state) => state.selectWorkspace);

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
    };
}
