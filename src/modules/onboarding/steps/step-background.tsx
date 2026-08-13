"use client"

import { motion } from "motion/react"
import { Check, Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/ui/components/ui/button"
import { Label } from "@/ui/components/ui/label"
import { Switch } from "@/ui/components/ui/switch"
import { containerVariants, itemVariants } from "../motion"
import { useUserStore } from "@/shared/stores/user-store"
import { useState } from "react"

interface StepBackgroundProps {
    onBack: () => void
    onFinish: () => void
}

export function StepBackground({ onBack, onFinish }: StepBackgroundProps) {
    const { runInBackground, setRunInBackground } = useUserStore()

    const [isFinishing, setIsFinishing] = useState<boolean>(false)

    const handleSetRunInBackground = async (value: boolean) => {
        setIsFinishing(true)
        await setRunInBackground(value)
        setIsFinishing(false)
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="flex flex-col"
        >
            <motion.header variants={itemVariants} className="mb-8 text-center">
                <h2 className="text-2xl font-semibold tracking-tight">Segundo plano</h2>
                <p className="mt-1 text-muted-foreground">Un último ajuste del sistema</p>
            </motion.header>

            <motion.div
                variants={itemVariants}
                className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-5"
            >
                <div className="space-y-1.5">
                    <Label htmlFor="bg" className="cursor-pointer text-base font-semibold">
                        Ejecutar en segundo plano
                    </Label>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        Al cerrar la ventana, Flux permanecerá activo en la bandeja del sistema para seguir
                        procesando tus flujos.
                    </p>
                </div>
                <Switch
                    id="bg"
                    checked={runInBackground}
                    onCheckedChange={(v) => void handleSetRunInBackground(v)}
                    disabled={isFinishing}
                />
            </motion.div>

            <motion.div variants={itemVariants} className="mt-10 grid grid-cols-2 gap-3">
                <Button variant="outline" size="lg" onClick={onBack} disabled={isFinishing} className="h-11">
                    <ArrowLeft className="size-4" data-icon="inline-start" />
                    Atrás
                </Button>
                <Button size="lg" onClick={onFinish} disabled={isFinishing} className="h-11">
                    {isFinishing ? (
                        <>
                            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                            Preparando…
                        </>
                    ) : (
                        <>
                            <Check className="size-4" data-icon="inline-start" />
                            Finalizar
                        </>
                    )}
                </Button>
            </motion.div>
        </motion.div>
    )
}
