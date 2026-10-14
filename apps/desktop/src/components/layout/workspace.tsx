'use client';

import { useEffect, useState, Suspense } from 'react';
import { Spinner } from '@flux/ui/spinner';
import { api } from '@flux/api';

import { cn } from 'cn';
import { resolveRoute } from '@/shared/router/route-meta';
import { tabViews } from '@/shared/router/tab-views';
import { TabProvider } from '@/shared/state/tab-context';
import { useTabs, type Tab } from '@/shared/state/tabs';
import { ErrorBoundary } from './ErrorBoundary';

const Fallback = () => (
    <div className="flex h-full w-full items-center justify-center">
        <Spinner className='size-8 text-primary' />
    </div>
);

/** Un tab. Las vistas de los tabs ya visitados se mantienen montadas (ocultas) para conservar su estado. */
function TabPane({ tab, isActive }: { tab: Tab; isActive: boolean }) {
    const route = resolveRoute(tab.path);
    const View = route ? tabViews[route.meta.pattern] : undefined;
    if (!View) return null;

    return (
        <div
            className={cn('h-full w-full', !isActive && 'hidden')}
            aria-hidden={!isActive}
            // `inert` evita foco/clics en tabs ocultos
            {...(!isActive ? { inert: true } : {})}
        >
            <TabProvider tab={tab} isActive={isActive}>
                <ErrorBoundary>
                    <Suspense fallback={<Fallback />}>
                        <View />
                    </Suspense>
                </ErrorBoundary>
            </TabProvider>
        </div>
    );
}

export function Workspace() {
    const { tabs, activeId, activePath } = useTabs();

    // Un tab restaurado de la sesión no se monta hasta que se visita por primera vez
    // (evita cargar 10 canvas a la vez al arrancar). Una vez montado, sigue montado.
    const [visited, setVisited] = useState<ReadonlySet<string>>(() => new Set([activeId]));
    useEffect(() => {
        setVisited((prev) => (prev.has(activeId) ? prev : new Set(prev).add(activeId)));
    }, [activeId]);

    // Título de la ventana = tab activo
    useEffect(() => {
        const route = resolveRoute(activePath);
        const title = route ? `Flux - ${route.title}` : 'Flux';

        try {
            document.title = title;
            if (api.system.type() !== 'macos') {
                api.window.getCurrentWindow().setTitle(title).catch(console.error);
            }
        } catch (err) {
            console.error('Failed to set window title (maybe running in browser without Tauri)', err);
        }
    }, [activePath]);

    return (
        <>
            {tabs
                .filter((tab) => tab.id === activeId || visited.has(tab.id))
                .map((tab) => (
                    <TabPane key={tab.id} tab={tab} isActive={tab.id === activeId} />
                ))}
        </>
    );
}
