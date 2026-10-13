'use client';

import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

import { cn } from '@/shared/utils/utils';
import { FLOW_ROUTE_PATTERN, getTabIcon, resolveRoute } from '@/shared/router/route-meta';
import { useTabs } from '@/shared/state/tabs';
import { useFlowDirty, isFlowTabDirty } from '@/modules/flows/core/use-flow-store';
import { api } from '@flux/api';
import { useEffect, useRef, useCallback } from 'react';

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

/** Punto de "cambios sin guardar" (solo para tabs de flujo). */
function DirtyDot({ tabId }: { tabId: string }) {
    const dirty = useFlowDirty(tabId);
    if (!dirty) return null;
    return <span className="size-1.5 shrink-0 rounded-full bg-amber-500" role="img" aria-label="Cambios sin guardar" />;
}

export function TabBar() {
    const { tabs, activeId, activateTab, closeTab } = useTabs();

    const scrollRef = useRef<HTMLDivElement>(null);

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

    const handleTabClick = useCallback((id: string) => activateTab(id), [activateTab]);

    const handleCloseTab = useCallback(
        async (e: React.MouseEvent, id: string, title: string) => {
            e.stopPropagation();
            if (isFlowTabDirty(id)) {
                const discard = await api.dialog.ask(
                    `"${title}" tiene cambios sin guardar. Si lo cierras se perderán.`,
                    { title: 'Cambios sin guardar', kind: 'warning', okLabel: 'Cerrar sin guardar', cancelLabel: 'Cancelar' },
                );
                if (!discard) return;
            }
            closeTab(id);
        },
        [closeTab]
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
                            const route = resolveRoute(tab.path);
                            const title = route?.title ?? tab.path;
                            const closable = route?.meta.closable ?? true;
                            const isFlow = route?.meta.pattern === FLOW_ROUTE_PATTERN;
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
                                        'group relative flex h-9 min-w-35 max-w-55 items-center shrink-0 cursor-pointer',
                                        !isActive &&
                                            'rounded-t-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground',
                                        isActive && 'text-foreground'
                                    )}
                                    onClick={() => handleTabClick(tab.id)}
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
                                            {isFlow && <DirtyDot tabId={tab.id} />}
                                        </div>

                                        {closable ? (
                                            <button
                                                type="button"
                                                onClick={(event) => handleCloseTab(event, tab.id, title)}
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
