'use client';

import { useEffect, type ReactNode } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { HOME_PATH, getRoute, routes } from '@/shared/router/tab-routes';

/**
 * A single open tab. We only persist the `path` (a serializable route key) and
 * which tab is active — everything else (title, icon, component) is derived
 * from the route registry. This keeps the persisted payload tiny and makes it
 * trivial to later hand `path` over to react-router's `navigate()`.
 */
export interface OpenTab {
    /** Stable unique id for the tab INSTANCE (duplicates share a path, not an id). */
    id: string;
    /** The route path this tab points at. */
    path: string;
}

interface OpenTabOptions {
    /**
     * When `true`, focus an already-open tab for this path instead of opening a
     * new one. Defaults to `true` only for non-closable routes (e.g. Home), so
     * closable routes can be opened multiple times — open as many "Flujo de
     * Ventas" tabs as you like.
     */
    focusExisting?: boolean;
}

interface TabsState {
    tabs: OpenTab[];
    activeId: string;
    /** Flipped to `true` once persisted state has been read on the client. */
    hasHydrated: boolean;

    /** Open a route in a tab and return its path. See {@link OpenTabOptions} for de-duplication. */
    openTab: (path: string, options?: OpenTabOptions) => string;
    /** Focus an already-open tab by id. */
    activateTab: (id: string) => void;
    /** Close a tab by id and return the new active path to navigate to, if changed. */
    closeTab: (id: string) => string | undefined;
    setHasHydrated: (value: boolean) => void;
}

const STORAGE_KEY = 'flowdesk.tabs.v1';

function createId() {
    return Math.random().toString(36).slice(2, 10);
}

/**
 * Deterministic initial state. The Home tab uses a STABLE id so the very first
 * server render and client render produce identical output (no hydration
 * mismatch). Real persisted state is merged in afterwards by the persist
 * middleware once we manually rehydrate on the client.
 */
function defaultTabs(): Pick<TabsState, 'tabs' | 'activeId'> {
    return { tabs: [{ id: 'home', path: HOME_PATH }], activeId: 'home' };
}

/**
 * Sanitize whatever we read from storage: drop tabs whose route no longer
 * exists in the registry, guarantee a Home tab is present, and make sure
 * `activeId` points at a real tab.
 */
function sanitize(tabs: OpenTab[], activeId: string) {
    const valid = tabs.filter((tab) => getRoute(tab.path));
    if (!valid.some((tab) => tab.path === HOME_PATH)) {
        valid.unshift({ id: 'home', path: HOME_PATH });
    }
    const active = valid.some((tab) => tab.id === activeId) ? activeId : valid[0].id;
    return { tabs: valid, activeId: active };
}

/**
 * The Zustand store, wrapped in the `persist` middleware so open tabs survive a
 * reload with zero manual `localStorage` plumbing.
 *
 * Persistence notes:
 *  - `partialize` persists ONLY `tabs` + `activeId` (never `hasHydrated`).
 *  - `skipHydration: true` keeps SSR deterministic; we call `rehydrate()`
 *    ourselves from {@link TabsProvider} after mount.
 *  - `merge` runs our {@link sanitize} pass so stale/removed routes can't break
 *    a restored session.
 */
export const useTabsStore = create<TabsState>()(
    persist(
        (set, get) => ({
            ...defaultTabs(),
            hasHydrated: false,

            openTab: (path, options) => {
                const route = getRoute(path);
                if (!route) return path;

                const focusExisting = options?.focusExisting ?? !route.closable;
                const { tabs } = get();

                if (focusExisting) {
                    const existing = tabs.find((tab) => tab.path === path);
                    if (existing) {
                        set({ activeId: existing.id });
                        return path;
                    }
                }

                const tab: OpenTab = { id: createId(), path };
                set({ tabs: [...tabs, tab], activeId: tab.id });
                return path;
            },

            activateTab: (id) => {
                if (get().tabs.some((tab) => tab.id === id)) set({ activeId: id });
            },

            closeTab: (id) => {
                const { tabs, activeId } = get();
                const target = tabs.find((tab) => tab.id === id);
                if (!target) return;
                const route = getRoute(target.path);
                if (route && !route.closable) return;

                const index = tabs.findIndex((tab) => tab.id === id);
                const next = tabs.filter((tab) => tab.id !== id);

                let nextActive = activeId;
                let nextPath: string | undefined = undefined;
                if (activeId === id) {
                    // Activate the neighbour to the left, else the new first tab.
                    const nextTab = next[index - 1] ?? next[0];
                    nextActive = nextTab.id;
                    nextPath = nextTab.path;
                }
                set({ tabs: next, activeId: nextActive });
                return nextPath;
            },

            setHasHydrated: (value) => set({ hasHydrated: value }),
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ tabs: state.tabs, activeId: state.activeId }),
            skipHydration: true,
            merge: (persisted, current) => {
                const incoming = persisted as Partial<Pick<TabsState, 'tabs' | 'activeId'>> | null;
                if (!incoming?.tabs?.length) return current;
                return {
                    ...current,
                    ...sanitize(incoming.tabs, incoming.activeId ?? current.activeId),
                };
            },
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);

/** Currently active route path, derived from the store. */
export function useActivePath(): string {
    return useTabsStore((state) => state.tabs.find((tab) => tab.id === state.activeId)?.path ?? HOME_PATH);
}

/**
 * Ergonomic facade kept for backwards-compatibility with the previous Context
 * API. Selectors are split so components only re-render on the slices they use.
 */
export function useTabs() {
    const tabs = useTabsStore((state) => state.tabs);
    const activeId = useTabsStore((state) => state.activeId);
    const hasHydrated = useTabsStore((state) => state.hasHydrated);
    const openTab = useTabsStore((state) => state.openTab);
    const activateTab = useTabsStore((state) => state.activateTab);
    const closeTab = useTabsStore((state) => state.closeTab);
    const activePath = useActivePath();

    return { tabs, activeId, activePath, hasHydrated, openTab, activateTab, closeTab };
}

/**
 * Triggers the one-time client rehydration for the persisted store. Kept as a
 * thin "Provider" so existing usage (`<TabsProvider>`) and SSR stay intact even
 * though Zustand itself needs no React context.
 */
export function TabsProvider({ children }: { children: ReactNode }) {
    useEffect(() => {
        void useTabsStore.persist.rehydrate();
    }, []);

    return <>{children}</>;
}

export { routes };
