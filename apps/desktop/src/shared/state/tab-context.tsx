import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { resolveRoute } from '@/shared/router/route-meta';
import type { Tab } from './tabs';

interface TabContextValue {
    tabId: string;
    path: string;
    /** Parámetros de la ruta, ya decodificados (ej. `pathId` = ruta del archivo .flux). */
    params: Record<string, string>;
    /** `true` cuando este tab es el visible. Los demás siguen montados pero ocultos. */
    isActive: boolean;
}

const TabContext = createContext<TabContextValue | null>(null);

export function TabProvider({ tab, isActive, children }: { tab: Tab; isActive: boolean; children: ReactNode }) {
    const value = useMemo<TabContextValue>(
        () => ({ tabId: tab.id, path: tab.path, params: resolveRoute(tab.path)?.params ?? {}, isActive }),
        [tab.id, tab.path, isActive],
    );
    return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}

/** Contexto del tab en el que se está renderizando. Solo válido dentro de una vista de tab. */
export function useTab(): TabContextValue {
    const ctx = useContext(TabContext);
    if (!ctx) throw new Error('useTab() debe usarse dentro de una vista de tab');
    return ctx;
}

export const useTabId = () => useTab().tabId;
