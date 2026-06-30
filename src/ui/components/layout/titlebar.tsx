'use client';

import { platform } from '@tauri-apps/plugin-os';
import { TabBar } from './tab-bar';
import { WindowControls } from './window-controls';
import { Settings } from 'lucide-react';
import { Logo } from '@/ui/components/ui/logo';

export function Titlebar() {
    const osPlatform = platform();

    return (
        <div data-tauri-drag-region className="flex h-11 items-stretch justify-between bg-background/0 select-none overflow-hidden border-b border-border/50">
            {/* LEFT ZONE: Logo & macOS Margin */}
            <div data-tauri-drag-region className="flex items-center shrink-0">
                <div className={osPlatform === 'macos' ? 'ml-18' : 'ml-4'} />
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
                <button className="px-3 h-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                    <Settings className="size-4" />
                </button>
                <WindowControls />
            </div>
        </div>
    );
}
