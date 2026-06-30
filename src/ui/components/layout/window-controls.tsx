'use client';

import { getCurrentWindow } from '@tauri-apps/api/window';
import { platform } from '@tauri-apps/plugin-os';
import { useInterval } from '@mantine/hooks';
import { ButtonHTMLAttributes, useEffect, useState } from 'react';
import { VscChromeMaximize, VscChromeMinimize, VscChromeClose, VscChromeRestore } from 'react-icons/vsc';
import { cn } from '@/shared/utils/utils';

const ButtonWindowControl = (props: ButtonHTMLAttributes<HTMLButtonElement>) => {
    return (
        <button
            {...props}
            // Retain the exact native feel (aspect square, 11 height from parent)
            className={cn(
                'hover:bg-muted aspect-square h-full text-muted-foreground flex items-center justify-center transition-colors',
                props.className
            )}
        />
    );
};

export function WindowControls() {
    const osPlatform = platform();
    const [maximized, setMaximized] = useState(false);

    const tauriInterval = useInterval(async () => {
        try {
            const window = getCurrentWindow();
            const isMaximized = await window.isMaximized();
            setMaximized(isMaximized);
        } catch (e) {
            // Ignore if running outside Tauri
        }
    }, 200);

    useEffect(() => {
        tauriInterval.start();
        return () => tauriInterval.stop();
    }, [tauriInterval]);

    // Native window controls are only manually rendered on non-macOS platforms.
    // macOS uses its native traffic lights.
    if (osPlatform === 'macos') return null;

    return (
        <div className="flex h-full items-stretch">
            <ButtonWindowControl
                onClick={() => {
                    getCurrentWindow().minimize().catch(console.error);
                }}
            >
                <VscChromeMinimize className="size-4" />
            </ButtonWindowControl>
            <ButtonWindowControl
                onClick={() => {
                    getCurrentWindow().toggleMaximize().catch(console.error);
                    setMaximized(!maximized);
                }}
            >
                {maximized ? <VscChromeRestore className="size-4" /> : <VscChromeMaximize className="size-4" />}
            </ButtonWindowControl>
            <ButtonWindowControl
                onClick={() => {
                    getCurrentWindow().close().catch(console.error);
                }}
                className="hover:bg-red-500 hover:text-red-50"
            >
                <VscChromeClose className="size-4" />
            </ButtonWindowControl>
        </div>
    );
}
