'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Plus, X } from 'lucide-react';
import { VscChromeMaximize, VscChromeMinimize, VscChromeClose, VscChromeRestore } from 'react-icons/vsc';

import { cn } from '@/shared/utils/utils';
import { getRoute, getTabIcon } from '@/shared/router/tab-routes';
import { useTabs } from '@/shared/contexts/tabs-context';
import { platform } from '@tauri-apps/plugin-os';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ButtonHTMLAttributes, useEffect, useState, useCallback } from 'react';
import { useInterval } from '@mantine/hooks';
import { useNavigate, useLocation } from 'react-router';

/**
 * The "skin" that makes the active tab look carved out of the content surface
 * below it. It is a SINGLE element shared across tabs via `layoutId`, so when
 * you activate a different tab, Motion physically transports the whole skin —
 * border, orange accent and flared corners included — from the old tab to the
 * new one. Everything visual about "the active tab" lives here.
 */
function ActiveTabSkin() {
    return (
        <motion.div
            layoutId="active-tab-skin"
            transition={{ type: 'spring', stiffness: 620, damping: 46, mass: 0.7 }}
            className="absolute inset-x-0 top-0 bottom-0 rounded-t-[10px] border border-b-0 border-border -bg-background" //Color comentado
        >
            {/* Orange top accent + soft "desfase" glow that bleeds downward. */}
            <span className="pointer-events-none absolute inset-x-0 top-0 h-full rounded-t-[10px] bg-primary/15 blur-[6px]" />

            {/* Concave flares: small squares sitting just outside each bottom corner,
          filled with the content background and carved with a radial gradient
          so the tab base curves OUTWARD and melts into the panel below. */}
            <span
                aria-hidden="true"
                className="absolute -left-2 bottom-0 size-2"
                // style={{
                //   background:
                //     'radial-gradient(circle at 0 0, transparent 8px, var(--background) 8.5px)',
                // }}
            />
            <span
                aria-hidden="true"
                className="absolute -right-2 bottom-0 size-2"
                // style={{
                //   background:
                //     'radial-gradient(circle at 100% 0, transparent 8px, var(--background) 8.5px)',
                // }}
            />
        </motion.div>
    );
}

export function TabBar() {
    const { tabs, activeId, activateTab, closeTab, openTab } = useTabs();
    const [maximized, setMaximized] = useState(false);
    const osPlatform = platform();
    const navigate = useNavigate();
    const location = useLocation();

    // Sync active state if location changes from outside the tab bar
    useEffect(() => {
        const matchingTab = tabs.find((t) => t.path === location.pathname);
        if (matchingTab && matchingTab.id !== activeId) {
            activateTab(matchingTab.id);
        }
    }, [location.pathname, tabs, activeId, activateTab]);

    const handleTabClick = useCallback(
        (id: string, path: string) => {
            activateTab(id);
            navigate(path);
        },
        [activateTab, navigate]
    );

    const handleCloseTab = useCallback(
        (e: React.MouseEvent, id: string) => {
            e.stopPropagation();
            const nextPath = closeTab(id);
            if (nextPath) {
                navigate(nextPath);
            }
        },
        [closeTab, navigate]
    );

    const handleOpenTab = useCallback(
        (path: string) => {
            const openedPath = openTab(path);
            navigate(openedPath);
        },
        [openTab, navigate]
    );

    const tauriInterval = useInterval(async () => {
        const window = getCurrentWindow();
        const isMaximized = await window.isMaximized();
        setMaximized(isMaximized);
    }, 200);

    useEffect(() => {
        tauriInterval.start();
        return () => tauriInterval.stop();
    }, []);

    return (
        // No bottom border on the bar itself: the seam is just a color change
        // (card -> background). The active skin punches a background-coloured notch
        // straight through it, which is what fuses the tab into the content.
        <div data-tauri-drag-region className="flex h-11 items-stretch gap-1 bg-background/0  select-none">
            {/* macOS traffic lights — purely decorative for the native feel */}
            <div className={osPlatform === 'macos' ? 'ml-18' : 'ml-6'} />

            <div data-tauri-drag-region className="flex flex-1 items-end gap-1">
                {/* `initial={false}` skips the entry animation on first paint/hydration,
            so only tabs opened *after* mount animate in. `popLayout` lets
            neighbouring tabs slide over smoothly as one is removed. */}
                <AnimatePresence initial={false} mode="popLayout">
                    {tabs.map((tab) => {
                        // `getTabIcon` always resolves an icon (route icon or fallback),
                        // so routes without their own `icon` still render correctly.
                        const Icon = getTabIcon(tab.path);
                        const route = getRoute(tab.path);
                        const title = route?.title ?? tab.path;
                        const closable = route?.closable ?? true;
                        const isActive = tab.id === activeId;

                        return (
                            <motion.div
                                key={tab.id}
                                layout
                                initial={{ opacity: 0, y: 6, width: 0 }}
                                animate={{ opacity: 1, y: 0, width: 'auto' }}
                                exit={{ opacity: 0, y: 6, width: 0 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 550,
                                    damping: 38,
                                    mass: 0.6,
                                }}
                                className={cn(
                                    'group relative flex h-9 min-w-32 max-w-56 items-center',
                                    // Inactive tabs float in the nothing: no border, no fill —
                                    // just a whisper of a hover surface.
                                    !isActive &&
                                        'rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground',
                                    isActive && 'text-foreground'
                                )}
                                onClick={() => handleTabClick(tab.id, tab.path)}
                            >
                                {isActive ? <ActiveTabSkin /> : null}

                                <div className="relative z-30 flex w-full items-center gap-2 px-3">
                                    <button
                                        type="button"
                                        className="flex min-w-0 flex-1 items-center gap-2 text-sm outline-none"
                                        aria-current={isActive ? 'page' : undefined}
                                    >
                                        <Icon
                                            className={cn(
                                                'size-4 shrink-0',
                                                isActive ? 'text-primary' : 'text-muted-foreground'
                                            )}
                                        />
                                        <span className="truncate">{title}</span>
                                    </button>

                                    {closable ? (
                                        <button
                                            type="button"
                                            onClick={(event) => handleCloseTab(event, tab.id)}
                                            aria-label={`Cerrar ${title}`}
                                            className="grid size-5 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition hover:bg-foreground/10 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    ) : (
                                        <span className="size-5 shrink-0" aria-hidden="true" />
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {/* Quick "new tab". Duplicates are allowed for closable routes, so this
            opens a fresh "Flujo de Ventas" tab every time it's clicked. */}
                <motion.button
                    type="button"
                    layout
                    whileTap={{ scale: 0.88 }}
                    onClick={() => handleOpenTab('/flows/sales')}
                    aria-label="Nueva pestaña"
                    className="mb-1 ml-1 grid size-7 mt-3 shrink-0 place-items-center self-center rounded-md text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
                >
                    <Plus className="size-4" />
                </motion.button>
            </div>

            {osPlatform !== 'macos' && (
                <div className="flex items-center">
                    <ButtonWindowControl
                        onClick={() => {
                            getCurrentWindow().minimize();
                        }}
                    >
                        <VscChromeMinimize className="size-4" />
                    </ButtonWindowControl>
                    <ButtonWindowControl
                        onClick={() => {
                            getCurrentWindow().toggleMaximize();
                            setMaximized(!maximized);
                        }}
                    >
                        {maximized ? <VscChromeRestore className="size-4" /> : <VscChromeMaximize className="size-4" />}
                    </ButtonWindowControl>
                    <ButtonWindowControl
                        onClick={() => {
                            getCurrentWindow().close();
                        }}
                        className="hover:bg-red-500 hover:text-red-50"
                    >
                        <VscChromeClose className="size-4" />
                    </ButtonWindowControl>
                </div>
            )}
        </div>
    );
}

const ButtonWindowControl = (props: ButtonHTMLAttributes<HTMLButtonElement>) => {
    return (
        <button
            {...props}
            className={cn(
                'hover:bg-muted aspect-square h-full text-muted-foreground flex items-center justify-center',
                props.className
            )}
        />
    );
};
