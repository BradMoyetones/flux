"use client"

import type React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/shared/utils/utils"

/* ---------------------------------- Switch --------------------------------- */

export function Switch({
    checked,
    onCheckedChange,
    id,
    disabled,
}: {
    checked: boolean
    onCheckedChange: (v: boolean) => void
    id?: string
    disabled?: boolean
}) {
    return (
        <button
            id={id}
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onCheckedChange(!checked)}
            className={cn(
                "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors outline-none",
                "focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 disabled:pointer-events-none",
                checked ? "bg-(--primary)" : "bg-input",
            )}
        >
            <span
                className={cn(
                    "pointer-events-none inline-block size-4 transform rounded-full bg-background shadow-sm transition-transform",
                    checked ? "translate-x-4" : "translate-x-0.5",
                )}
            />
        </button>
    )
}

/* ---------------------------------- Field ---------------------------------- */

export function Field({
    label,
    hint,
    htmlFor,
    children,
    className,
}: {
    label: string
    hint?: string
    htmlFor?: string
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={cn("space-y-1.5", className)}>
            <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
                {label}
            </label>
            {children}
            {hint ? <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p> : null}
        </div>
    )
}

/* --------------------------------- Inputs ---------------------------------- */

export function TextInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className={cn(
                "flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground",
                "placeholder:text-muted-foreground transition-colors outline-none",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
                "disabled:opacity-50 disabled:pointer-events-none",
                className,
            )}
            {...props}
        />
    )
}

export function TextArea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            className={cn(
                "flex min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground",
                "placeholder:text-muted-foreground transition-colors outline-none resize-none leading-relaxed",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
                className,
            )}
            {...props}
        />
    )
}

export function Select({
    className,
    children,
    ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div className="relative">
            <select
                className={cn(
                    "flex h-9 w-full appearance-none rounded-lg border border-border bg-background pl-3 pr-8 text-sm text-foreground",
                    "transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
                    className,
                )}
                {...props}
            >
                {children}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
    )
}

/* ------------------------------ SegmentedControl --------------------------- */

export function SegmentedControl<T extends string>({
    value,
    onChange,
    options,
    className,
}: {
    value: T
    onChange: (v: T) => void
    options: { value: T; label: string; icon?: React.ReactNode }[]
    className?: string
}) {
    return (
        <div className={cn("inline-flex rounded-lg border border-border bg-muted/50 p-0.5", className)}>
            {options.map((opt) => {
                const active = opt.value === value
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1 text-xs font-medium transition-all",
                            active
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {opt.icon}
                        {opt.label}
                    </button>
                )
            })}
        </div>
    )
}

/* --------------------------------- Badge ----------------------------------- */

export function Badge({
    children,
    tone = "neutral",
    className,
}: {
    children: React.ReactNode
    tone?: "neutral" | "primary" | "success" | "warning" | "danger"
    className?: string
}) {
    const tones: Record<string, string> = {
        neutral: "bg-muted text-muted-foreground border-border",
        primary: "bg-[var(--primary)]/12 text-[var(--primary)] border-[var(--primary)]/25",
        success: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
        warning: "bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25",
        danger: "bg-destructive/12 text-destructive border-destructive/25",
    }
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
                tones[tone],
                className,
            )}
        >
            {children}
        </span>
    )
}

/* --------------------------------- Rows ------------------------------------ */

export function SettingRow({
    title,
    description,
    children,
    className,
}: {
    title: string
    description?: string
    children?: React.ReactNode
    className?: string
}) {
    return (
        <div
            className={cn(
                "flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0",
                className,
            )}
        >
            <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-foreground">{title}</p>
                {description ? (
                    <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                ) : null}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    )
}

/* ------------------------------ Section shell ------------------------------ */

export function SectionCard({
    title,
    description,
    children,
    action,
    className,
}: {
    title?: string
    description?: string
    children: React.ReactNode
    action?: React.ReactNode
    className?: string
}) {
    return (
        <section className={cn("rounded-xl border border-border bg-card", className)}>
            {(title || action) && (
                <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-3.5">
                    <div className="space-y-0.5">
                        {title ? <h3 className="text-sm font-semibold text-card-foreground">{title}</h3> : null}
                        {description ? (
                            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                        ) : null}
                    </div>
                    {action}
                </header>
            )}
            <div className="px-5 py-4">{children}</div>
        </section>
    )
}

export function CheckPill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                selected
                    ? "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
        >
            {selected ? <Check className="size-3" /> : null}
            {children}
        </button>
    )
}
