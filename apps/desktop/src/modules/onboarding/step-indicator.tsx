"use client"

import { motion } from "motion/react"
import { ease } from "./motion"

interface StepIndicatorProps {
    total: number
    current: number
}

export function StepIndicator({ total, current }: StepIndicatorProps) {
    return (
        <div className="flex items-center justify-center gap-2" aria-hidden="true">
            {Array.from({ length: total }).map((_, i) => {
                const active = i === current
                return (
                    <motion.span
                        key={i}
                        className="h-1.5 rounded-full bg-muted-foreground/25"
                        animate={{
                            width: active ? 28 : 8,
                            backgroundColor: i <= current ? "var(--primary)" : "var(--muted-foreground)",
                            opacity: i <= current ? 1 : 0.3,
                        }}
                        transition={{ duration: 0.4, ease }}
                    />
                )
            })}
        </div>
    )
}
