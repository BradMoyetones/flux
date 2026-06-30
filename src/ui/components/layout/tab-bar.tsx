'use client';

import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

import { cn } from '@/shared/utils/utils';
import { getRoute, getTabIcon } from '@/shared/router/tab-routes';
import { useTabs } from '@/shared/contexts/tabs-context';
import { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';

function ActiveTabSkin() {
    return (
        <motion.div
            layoutId="active-tab-skin"
            transition={{ type: 'spring', stiffness: 620, damping: 46, mass: 0.7 }}
            className="absolute inset-x-0 top-0 bottom-0 rounded-t-[10px] border border-b-0 border-border -bg-background"
        >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-full rounded-t-[10px] bg-primary/15 blur-[6px]" />
            <span aria-hidden="true" className="absolute -left-2 bottom-0 size-2" />
            <span aria-hidden="true" className="absolute -right-2 bottom-0 size-2" />
        </motion.div>
    );
}

export function TabBar() {
    const { tabs, activeId, activateTab, closeTab } = useTabs();
    const navigate = useNavigate();
    const location = useLocation();

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Sync active state if location changes from outside the tab bar
        const matchingTab = tabs.find((t) => t.path === location.pathname);
        if (matchingTab && matchingTab.id !== activeId) {
            activateTab(matchingTab.id);
        }
    }, [location.pathname, tabs, activeId, activateTab]);

    // Enable mouse wheel scrolling for the tab list
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const onWheel = (e: WheelEvent) => {
            // Only capture vertical wheel events (like typical mouse scroll) to convert to horizontal
            if (e.deltaY !== 0) {
                e.preventDefault();
                el.scrollBy({ left: e.deltaY, behavior: 'smooth' });
            }
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

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

    return (
        <div className="flex h-full w-full items-end relative overflow-hidden">
            {/* Scroll Container */}
            <div
                data-tauri-drag-region
                ref={scrollRef}
                className="flex flex-1 items-end gap-1 overflow-x-auto"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                <style>{`div::-webkit-scrollbar { display: none; }`}</style>
                <div className="flex items-end gap-1 px-1">
                    <AnimatePresence initial={false} mode="popLayout">
                        {tabs.map((tab) => {
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
                                        'group relative flex h-9 min-w-[140px] max-w-[220px] items-center shrink-0 cursor-pointer',
                                        !isActive &&
                                            'rounded-t-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground',
                                        isActive && 'text-foreground'
                                    )}
                                    onClick={() => handleTabClick(tab.id, tab.path)}
                                >
                                    {isActive ? <ActiveTabSkin /> : null}

                                    <div className="relative z-30 flex w-full items-center gap-2 px-3">
                                        <div
                                            className="flex min-w-0 flex-1 items-center gap-2 text-sm"
                                            aria-current={isActive ? 'page' : undefined}
                                        >
                                            <Icon
                                                className={cn(
                                                    'size-4 shrink-0',
                                                    isActive ? 'text-primary' : 'text-muted-foreground'
                                                )}
                                            />
                                            <span className="truncate">{title}</span>
                                        </div>

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
                </div>
            </div>
        </div>
    );
}
