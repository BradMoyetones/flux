"use client"

import { motion } from "motion/react"
import { ArrowRight } from "lucide-react"
import { Button } from '@flux/ui'
import { containerVariants, itemVariants } from "../motion"

interface StepWelcomeProps {
    onNext: () => void
}

export function StepWelcome({ onNext }: StepWelcomeProps) {
    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="flex flex-col items-center text-center"
        >
            <motion.div variants={itemVariants} className="mb-8">
                <div className="relative flex size-24 items-center justify-center rounded-3xl border border-border bg-card shadow-sm">
                    <img
                        src="/app-icon.svg"
                        alt="Logo de Flux"
                        width={64}
                        height={64}
                        className="size-16 object-contain"
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                    />
                </div>
            </motion.div>

            <motion.h1
                variants={itemVariants}
                className="text-4xl font-semibold tracking-tight text-balance"
            >
                Bienvenido a Flux
            </motion.h1>

            <motion.p
                variants={itemVariants}
                className="mt-3 max-w-sm text-lg leading-relaxed text-muted-foreground text-pretty"
            >
                Tu motor de flujos local-first, rápido y privado.
            </motion.p>

            <motion.div variants={itemVariants} className="mt-10 w-full">
                <Button size="lg" onClick={onNext} className="h-12 w-full text-base">
                    Comenzar
                    <ArrowRight className="size-4" data-icon="inline-end" />
                </Button>
            </motion.div>
        </motion.div>
    )
}
