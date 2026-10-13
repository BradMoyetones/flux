import { atom, getDefaultStore, useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { useMemo } from 'react';
import { z } from 'zod';

import { HOME_PATH, resolveRoute } from '@/shared/router/route-meta';
import { validatedStorage } from './persisted-storage';

/**
 * Estado de los tabs con atoms.
 *
 *  - La sesión (tabs abiertos + tab activo) se persiste en `localStorage` con validación:
 *    al reiniciar la app los tabs vuelven donde estaban.
 *  - Un tab es una INSTANCIA (`id`) que apunta a una ruta (`path`). Dos tabs pueden
 *    apuntar a la misma ruta, aunque por defecto se reutiliza el existente.
 *  - Todo el estado por-tab (documento del flujo, selección, paneles…) cuelga del `id`
 *    y se limpia con `onTabClosed`.
 */

export interface Tab {
    /** Identidad de la instancia del tab. */
    id: string;
    /** Ruta (clave en `route-meta.ts`). */
    path: string;
}

export const HOME_TAB: Tab = { id: 'home', path: HOME_PATH };

const tabSchema = z.object({ id: z.string().min(1), path: z.string().min(1) });

/** Descarta tabs de rutas que ya no existen o con id repetido y garantiza el tab Home. */
function sanitizeTabs(raw: unknown): Tab[] | undefined {
    const parsed = z.array(tabSchema).safeParse(raw);
    if (!parsed.success) return undefined;

    const seen = new Set<string>();
    const tabs = parsed.data.filter((tab) => {
        if (seen.has(tab.id) || !resolveRoute(tab.path)) return false;
        seen.add(tab.id);
        return true;
    });
    if (!tabs.some((tab) => tab.path === HOME_PATH)) tabs.unshift(HOME_TAB);
    return tabs;
}

const sanitizeId = (raw: unknown): string | undefined => (typeof raw === 'string' && raw ? raw : undefined);

const storedTabsAtom = atomWithStorage<Tab[]>('flux.tabs.v1', [HOME_TAB], validatedStorage(sanitizeTabs), {
    getOnInit: true,
});
const storedActiveIdAtom = atomWithStorage<string>('flux.activeTab.v1', HOME_TAB.id, validatedStorage(sanitizeId), {
    getOnInit: true,
});

export const tabsAtom = atom((get) => get(storedTabsAtom));

/** Siempre apunta a un tab real (si el guardado quedó huérfano cae al primero). */
export const activeTabIdAtom = atom((get) => {
    const tabs = get(storedTabsAtom);
    const id = get(storedActiveIdAtom);
    return tabs.some((tab) => tab.id === id) ? id : (tabs[0]?.id ?? HOME_TAB.id);
});

export const activeTabAtom = atom((get) => {
    const id = get(activeTabIdAtom);
    return get(storedTabsAtom).find((tab) => tab.id === id) ?? HOME_TAB;
});

// ──── Limpieza de estado por-tab ────

const closeListeners = new Set<(tabId: string) => void>();

/** Registra un callback que se ejecuta cuando un tab se cierra (para liberar su estado). */
export function onTabClosed(listener: (tabId: string) => void): () => void {
    closeListeners.add(listener);
    return () => closeListeners.delete(listener);
}

// ──── Acciones ────

const newId = () => crypto.randomUUID().slice(0, 8);

export interface OpenTabOptions {
    /** Si ya hay un tab con esa ruta, enfocarlo en vez de abrir otro. Por defecto `true`. */
    focusExisting?: boolean;
}

/** Abre (o enfoca) un tab y devuelve su id. Una ruta inexistente se ignora. */
export const openTabAtom = atom(null, (get, set, input: { path: string } & OpenTabOptions): string | undefined => {
    if (!resolveRoute(input.path)) return undefined;

    const tabs = get(storedTabsAtom);
    if (input.focusExisting ?? true) {
        const existing = tabs.find((tab) => tab.path === input.path);
        if (existing) {
            set(storedActiveIdAtom, existing.id);
            return existing.id;
        }
    }

    const tab: Tab = { id: newId(), path: input.path };
    set(storedTabsAtom, [...tabs, tab]);
    set(storedActiveIdAtom, tab.id);
    return tab.id;
});

export const activateTabAtom = atom(null, (get, set, id: string) => {
    if (get(storedTabsAtom).some((tab) => tab.id === id)) set(storedActiveIdAtom, id);
});

/** Cambia la ruta de un tab (p. ej. al renombrar el archivo de un flujo). */
export const updateTabPathAtom = atom(null, (get, set, input: { id: string; path: string }) => {
    set(
        storedTabsAtom,
        get(storedTabsAtom).map((tab) => (tab.id === input.id ? { ...tab, path: input.path } : tab)),
    );
});

/** Cierra un tab (Home no se puede cerrar) y activa el vecino de la izquierda. */
export const closeTabAtom = atom(null, (get, set, id: string) => {
    const tabs = get(storedTabsAtom);
    const index = tabs.findIndex((tab) => tab.id === id);
    if (index === -1) return;
    if (resolveRoute(tabs[index].path)?.meta.closable === false) return;

    const next = tabs.filter((tab) => tab.id !== id);
    if (get(activeTabIdAtom) === id) {
        const neighbour = next[index - 1] ?? next[0];
        if (neighbour) set(storedActiveIdAtom, neighbour.id);
    }
    set(storedTabsAtom, next);
    closeListeners.forEach((listener) => listener(id));
});

// ──── API imperativa (fuera de componentes React: toasts, listeners…) ────

const store = getDefaultStore();

export const tabActions = {
    open: (path: string, options?: OpenTabOptions) => store.set(openTabAtom, { path, ...options }),
    activate: (id: string) => store.set(activateTabAtom, id),
    close: (id: string) => store.set(closeTabAtom, id),
    updatePath: (id: string, path: string) => store.set(updateTabPathAtom, { id, path }),
    getTabs: () => store.get(tabsAtom),
    getActiveId: () => store.get(activeTabIdAtom),
};

// ──── Hook ────

export function useTabs() {
    const tabs = useAtomValue(tabsAtom);
    const activeId = useAtomValue(activeTabIdAtom);
    const activeTab = useAtomValue(activeTabAtom);
    const open = useSetAtom(openTabAtom);
    const activateTab = useSetAtom(activateTabAtom);
    const closeTab = useSetAtom(closeTabAtom);
    const updateTabPath = useSetAtom(updateTabPathAtom);

    return useMemo(
        () => ({
            tabs,
            activeId,
            activePath: activeTab.path,
            openTab: (path: string, options?: OpenTabOptions) => open({ path, ...options }),
            activateTab,
            closeTab,
            updateTabPath: (id: string, path: string) => updateTabPath({ id, path }),
        }),
        [tabs, activeId, activeTab.path, open, activateTab, closeTab, updateTabPath],
    );
}
