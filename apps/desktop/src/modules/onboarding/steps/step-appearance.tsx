"use client"

import { motion } from "motion/react"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, ArrowLeft, ArrowRight, type LucideIcon } from "lucide-react"
import { Button } from '@flux/ui'
import { containerVariants, itemVariants, ease } from "../motion"

interface StepAppearanceProps {
    onNext: () => void
    onBack: () => void
}

const THEMES: { value: string; label: string; icon: LucideIcon }[] = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Oscuro", icon: Moon },
    { value: "system", label: "Sistema", icon: Monitor },
]

export function StepAppearance({ onNext, onBack }: StepAppearanceProps) {
    const { theme, setTheme } = useTheme()

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="flex flex-col"
        >
            <motion.header variants={itemVariants} className="mb-8 text-center">
                <h2 className="text-2xl font-semibold tracking-tight">Apariencia</h2>
                <p className="mt-1 text-muted-foreground">Elige tu tema preferido</p>
            </motion.header>

            <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
                {THEMES.map(({ value, label, icon: Icon }) => {
                    const active = theme === value
                    return (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setTheme(value)}
                            aria-pressed={active}
                            className="relative flex h-28 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card text-sm font-medium outline-none transition-colors hover:border-muted-foreground/40 focus-visible:border-ring data-[active=true]:border-primary"
                            data-active={active}
                        >
                            {active && (
                                <motion.span
                                    layoutId="theme-active"
                                    className="absolute inset-0 rounded-xl bg-primary/5 ring-1 ring-primary"
                                    transition={{ duration: 0.35, ease }}
                                />
                            )}
                            <Icon className="relative size-6" />
                            <span className="relative">{label}</span>
                        </button>
                    )
                })}
            </motion.div>

            <motion.div variants={itemVariants} className="mt-10 grid grid-cols-2 gap-3">
                <Button variant="outline" size="lg" onClick={onBack} className="h-11">
                    <ArrowLeft className="size-4" data-icon="inline-start" />
                    Atrás
                </Button>
                <Button size="lg" onClick={onNext} className="h-11">
                    Siguiente
                    <ArrowRight className="size-4" data-icon="inline-end" />
                </Button>
            </motion.div>
        </motion.div>
    )
}
