'use client';

import { TabBar } from '@/ui/components/layout/tab-bar';
import { Outlet, useLocation } from 'react-router';

/**
 * Renders the active tab's view using React Router Outlet.
 */
function TabHost() {
    const location = useLocation();

    // `key` forces a fresh mount per route so each view starts clean.
    return <Outlet key={location.pathname} />;
}

export function Workspace() {
    return (
        <div className="flex h-screen flex-col overflow-hidden bg-background/80 text-foreground">
            <TabBar />
            <main className="min-h-0 flex-1">
                <TabHost />
            </main>
        </div>
    );
}
