'use client';

import { api } from '@flux/api';
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

interface WindowControlsProps extends React.HTMLAttributes<HTMLDivElement> {}

export function WindowControls({className, ...props}: WindowControlsProps) {
    const osPlatform = api.system.platform();
    const [maximized, setMaximized] = useState(false);

    const tauriInterval = useInterval(async () => {
        try {
            const window = api.window.getCurrentWindow();
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
        <div className={cn("flex h-full items-stretch", className)} {...props}>
            <ButtonWindowControl
                onClick={() => {
                    api.window.getCurrentWindow().minimize().catch(console.error);
                }}
            >
                <VscChromeMinimize className="size-4" />
            </ButtonWindowControl>
            <ButtonWindowControl
                onClick={() => {
                    api.window.getCurrentWindow().toggleMaximize().catch(console.error);
                    setMaximized(!maximized);
                }}
            >
                {maximized ? <VscChromeRestore className="size-4" /> : <VscChromeMaximize className="size-4" />}
            </ButtonWindowControl>
            <ButtonWindowControl
                onClick={() => {
                    api.window.getCurrentWindow().close().catch(console.error);
                }}
                className="hover:bg-red-500 hover:text-red-50"
            >
                <VscChromeClose className="size-4" />
            </ButtonWindowControl>
        </div>
    );
}
