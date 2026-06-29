'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Plus, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { getRoute, getTabIcon } from '@/router/tab-routes'
import { useTabs } from '@/contexts/tabs-context'

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
      className="absolute inset-x-0 top-0 bottom-0 rounded-t-[10px] border border-b-0 border-border bg-background"
    >
      {/* Orange top accent + soft "desfase" glow that bleeds downward. */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] rounded-t-[10px] bg-primary" />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-6 rounded-t-[10px] bg-primary/15 blur-[6px]" />

      {/* Concave flares: small squares sitting just outside each bottom corner,
          filled with the content background and carved with a radial gradient
          so the tab base curves OUTWARD and melts into the panel below. */}
      <span
        aria-hidden="true"
        className="absolute -left-2 bottom-0 size-2"
        style={{
          background:
            'radial-gradient(circle at 0 0, transparent 8px, var(--background) 8.5px)',
        }}
      />
      <span
        aria-hidden="true"
        className="absolute -right-2 bottom-0 size-2"
        style={{
          background:
            'radial-gradient(circle at 100% 0, transparent 8px, var(--background) 8.5px)',
        }}
      />
    </motion.div>
  )
}

export function TabBar() {
  const { tabs, activeId, activateTab, closeTab, openTab } = useTabs()

  return (
    // No bottom border on the bar itself: the seam is just a color change
    // (card -> background). The active skin punches a background-coloured notch
    // straight through it, which is what fuses the tab into the content.
    <div className="flex h-11 items-stretch gap-1 bg-card px-2 pt-2 select-none">
      {/* macOS traffic lights — purely decorative for the native feel */}
      <div className="ml-18" />

      <div className="flex flex-1 items-end gap-1">
        {/* `initial={false}` skips the entry animation on first paint/hydration,
            so only tabs opened *after* mount animate in. `popLayout` lets
            neighbouring tabs slide over smoothly as one is removed. */}
        <AnimatePresence initial={false} mode="popLayout">
          {tabs.map((tab) => {
            // `getTabIcon` always resolves an icon (route icon or fallback),
            // so routes without their own `icon` still render correctly.
            const Icon = getTabIcon(tab.path)
            const route = getRoute(tab.path)
            const title = route?.title ?? tab.path
            const closable = route?.closable ?? true
            const isActive = tab.id === activeId

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
                  isActive && 'text-foreground',
                )}
                onClick={() => activateTab(tab.id)}
              >
                {isActive ? <ActiveTabSkin /> : null}

                <div
                  className="relative z-30 flex w-full items-center gap-2 px-3"
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-sm outline-none"
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon
                      className={cn(
                        'size-4 shrink-0',
                        isActive ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                    <span className="truncate">{title}</span>
                  </button>

                  {closable ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        closeTab(tab.id)
                      }}
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
            )
          })}
        </AnimatePresence>

        {/* Quick "new tab". Duplicates are allowed for closable routes, so this
            opens a fresh "Flujo de Ventas" tab every time it's clicked. */}
        <motion.button
          type="button"
          layout
          whileTap={{ scale: 0.88 }}
          onClick={() => openTab('/flows/sales')}
          aria-label="Nueva pestaña"
          className="mb-1 ml-1 grid size-7 shrink-0 place-items-center self-center rounded-md text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
        >
          <Plus className="size-4" />
        </motion.button>
      </div>
    </div>
  )
}
