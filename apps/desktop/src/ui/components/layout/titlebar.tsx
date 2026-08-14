'use client';

import { api } from '@flux/api';
import { TabBar } from './tab-bar';
import { WindowControls } from './window-controls';
import { Settings } from 'lucide-react';
import { Logo } from '@/ui/components/ui/logo';
import { cn } from '@/shared/utils/utils';
import { useNavigate } from 'react-router';
import { useTabs } from '@/shared/contexts/tabs-context';

export function Titlebar() {
    const osPlatform = api.system.platform();
    const navigate = useNavigate();
    const { openTab } = useTabs();

    const handleOpenTab = (path: string) => {
        const openedPath = openTab(path);
        navigate(openedPath);
    };

    return (
        <div data-tauri-drag-region className="flex z-1000 relative h-11 items-stretch justify-between bg-background/0 select-none overflow-hidden border-b border-border/50 pointer-events-auto!">
            {/* LEFT ZONE: Logo & macOS Margin */}
            <div data-tauri-drag-region className="flex items-center shrink-0">
                <div className={cn({
                    'ml-22': osPlatform === 'macos',
                    'ml-4': osPlatform !== 'macos'
                })} />
                <div className="flex items-center gap-2 pointer-events-none">
                    <Logo className="size-6 rounded-md" />
                    <span className="text-sm font-bold tracking-tight text-primary">Flux</span>
                </div>
            </div>

            {/* CENTER ZONE: Scrollable Tabs */}
            <div className="flex-1 min-w-0 mx-4 h-full relative">
                <TabBar />
            </div>

            {/* RIGHT ZONE: App Utilities & Window Controls */}
            <div data-tauri-drag-region className="flex items-stretch shrink-0">
                <button onClick={() => handleOpenTab("/settings")} className="px-3 h-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                    <Settings className="size-4" />
                </button>
                <WindowControls />
            </div>
        </div>
    );
}
