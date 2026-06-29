import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export type NodeAccent = 'webhook' | 'database' | 'action'

const accentClasses: Record<NodeAccent, { header: string; ring: string }> = {
  webhook: {
    header: 'bg-[var(--node-webhook)] text-white',
    ring: 'ring-[var(--node-webhook)]',
  },
  database: {
    header: 'bg-[var(--node-database)] text-white',
    ring: 'ring-[var(--node-database)]',
  },
  action: {
    header: 'bg-[var(--node-action)] text-[var(--primary-foreground)]',
    ring: 'ring-[var(--node-action)]',
  },
}

export interface FlowNodeProps {
  accent: NodeAccent
  icon: LucideIcon
  kind: string
  title: string
  subtitle: string
  fields: { label: string; value: string }[]
  /** Show an input handle on the left edge. */
  hasInput?: boolean
  /** Show an output handle on the right edge. */
  hasOutput?: boolean
  className?: string
  style?: React.CSSProperties
}

/**
 * A static "widget" node. The little circles on the left/right edges simulate
 * connection ports (handles) — they are purely visual here.
 */
export function FlowNode({
  accent,
  icon: Icon,
  kind,
  title,
  subtitle,
  fields,
  hasInput,
  hasOutput,
  className,
  style,
}: FlowNodeProps) {
  const colors = accentClasses[accent]

  return (
    <div
      style={style}
      className={cn(
        'relative w-64 rounded-xl border border-border bg-card shadow-lg shadow-black/30 transition hover:shadow-xl',
        className,
      )}
    >
      {/* Colored header */}
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-t-xl px-3.5 py-2.5',
          colors.header,
        )}
      >
        <span className="grid size-7 place-items-center rounded-md bg-white/20">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">
            {kind}
          </p>
          <p className="truncate text-sm font-semibold leading-tight">
            {title}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-2.5 px-3.5 py-3">
        <p className="text-xs text-muted-foreground text-pretty">{subtitle}</p>
        <div className="space-y-1.5">
          {fields.map((field) => (
            <div
              key={field.label}
              className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-2.5 py-1.5"
            >
              <span className="text-[11px] text-muted-foreground">
                {field.label}
              </span>
              <span className="truncate font-mono text-[11px] text-foreground">
                {field.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Handles (connection ports) */}
      {hasInput ? (
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-1/2 left-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground/70 ring-2',
            colors.ring,
          )}
        />
      ) : null}
      {hasOutput ? (
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-1/2 right-0 size-3 translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground/70 ring-2',
            colors.ring,
          )}
        />
      ) : null}
    </div>
  )
}
