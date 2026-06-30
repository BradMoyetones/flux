'use client';

import { useEffect, Suspense } from 'react';
import { Titlebar } from '@/ui/components/layout/titlebar';
import { Outlet, useLocation } from 'react-router';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getRoute } from '@/shared/router/tab-routes';
import { Spinner } from '@/ui/components/ui/spinner';

const Fallback = () => (
    <div className="flex h-full w-full items-center justify-center">
        <Spinner className='size-8 text-primary' />
    </div>
);

/**
 * Renders the active tab's view using React Router Outlet.
 */
function TabHost() {
    const location = useLocation();

    useEffect(() => {
        const route = getRoute(location.pathname);
        const title = route ? `Flux - ${route.title}` : 'Flux';
        
        try {
            // Update browser document title
            document.title = title;
            // Update Tauri OS window title
            getCurrentWindow().setTitle(title).catch(console.error);
        } catch (err) {
            console.error('Failed to set window title (maybe running in browser without Tauri)', err);
        }
    }, [location.pathname]);

    // `key` forces a fresh mount per route so each view starts clean.
    return (
        <Suspense fallback={<Fallback />}>
            <Outlet key={location.pathname} />
        </Suspense>
    );
}

export function Workspace() {
    return (
        <div className="flex h-screen flex-col overflow-hidden bg-background/80 text-foreground">
            <Titlebar />
            <main className="min-h-0 flex-1">
                <TabHost />
            </main>
        </div>
    );
}
