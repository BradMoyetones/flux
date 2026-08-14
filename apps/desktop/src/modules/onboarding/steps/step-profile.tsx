"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { Upload, Loader2, ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from '@flux/ui'
import { Input } from '@flux/ui'
import { Label } from '@flux/ui'
import { containerVariants, itemVariants } from "../motion"
import { useUserStore } from "@/shared/stores/user-store"
import { convertFileSrc } from "@tauri-apps/api/core"

interface StepProfileProps {
    onNext: () => void
    onBack: () => void
}

export function StepProfile({ onNext, onBack }: StepProfileProps) {
    const { userName, setUserName, avatarPath, uploadAvatar } = useUserStore()
    const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false)

    const canContinue = userName.trim().length > 0

    const handleFile = async () => {
        setIsUploadingAvatar(true)
        await uploadAvatar()
        setIsUploadingAvatar(false)
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
                <h2 className="text-2xl font-semibold tracking-tight">Tu perfil</h2>
                <p className="mt-1 text-muted-foreground">Personaliza cómo te ves en Flux</p>
            </motion.header>

            <motion.div variants={itemVariants} className="flex justify-center">
                <button
                    type="button"
                    onClick={handleFile}
                    className="group relative outline-none"
                    aria-label="Subir foto de perfil"
                >
                    <div className="flex size-28 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted transition-colors group-hover:border-primary group-focus-visible:border-primary">
                        {isUploadingAvatar ? (
                            <Loader2 className="size-7 animate-spin text-muted-foreground" />
                        ) : avatarPath ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={convertFileSrc(avatarPath)} alt="Tu avatar" className="size-full object-cover" />
                        ) : (
                            <Upload className="size-7 text-muted-foreground transition-colors group-hover:text-primary" />
                        )}
                    </div>
                    <span className="mt-2 block text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        {avatarPath ? "Cambiar foto" : "Subir foto"}
                    </span>
                </button>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-8 space-y-2">
                <Label htmlFor="name">¿Cómo te llamas?</Label>
                <Input
                    id="name"
                    value={userName}
                    onChange={(e) => void setUserName(e.target.value)}
                    placeholder="Ej. Alex"
                    className="h-12 text-base"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.nativeEvent.isComposing && canContinue) onNext()
                    }}
                />
            </motion.div>

            <motion.div variants={itemVariants} className="mt-10 grid grid-cols-2 gap-3">
                <Button variant="outline" size="lg" onClick={onBack} className="h-11">
                    <ArrowLeft className="size-4" data-icon="inline-start" />
                    Atrás
                </Button>
                <Button size="lg" onClick={onNext} disabled={!canContinue} className="h-11">
                    Siguiente
                    <ArrowRight className="size-4" data-icon="inline-end" />
                </Button>
            </motion.div>
        </motion.div>
    )
}
