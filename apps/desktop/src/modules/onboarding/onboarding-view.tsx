"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Check } from "lucide-react"
import { StepIndicator } from "./step-indicator"
import { ease } from "./motion"
import { StepWelcome } from "./steps/step-welcome"
import { StepProfile } from "./steps/step-profile"
import { StepAppearance } from "./steps/step-appearance"
import { StepBackground } from "./steps/step-background"
import { useUserStore } from "@/shared/stores/user-store"
import { WindowControls } from "@/ui/components/layout/window-controls"
import { Navigate } from "react-router"

const TOTAL_STEPS = 4

export function OnboardingView() {
    const [step, setStep] = useState(0)
    const { isFirstTime, setFinishOnboarding, userName, finishOnboarding, setIsFirstTime } = useUserStore()

    const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
    const back = () => setStep((s) => Math.max(s - 1, 0))

    const handleFinish = async () => {
        setFinishOnboarding(true)
        await new Promise((resolve) => setTimeout(resolve, 4000))
        await setIsFirstTime(false)
    }

    const renderStep = () => {
        switch (step) {
            case 0:
                return <StepWelcome key="welcome" onNext={next} />
            case 1:
                return <StepProfile key="profile" onNext={next} onBack={back} />
            case 2:
                return <StepAppearance key="appearance" onNext={next} onBack={back} />
            case 3:
                return <StepBackground key="background" onBack={back} onFinish={handleFinish} />
            default:
                return null
        }
    }

    if (!isFirstTime) return <Navigate to="/" />;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-background select-none cursor-default">
            <header data-tauri-drag-region className="flex h-11 shrink-0 items-center justify-end">
                <WindowControls />
            </header>

            <main className="flex flex-1 items-center justify-center px-6 pb-16">
                <div className="w-full max-w-md">
                    <AnimatePresence mode="wait">
                        {isFirstTime && !finishOnboarding ? (
                            renderStep()
                        ) : (
                            <motion.div
                                key="done"
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4, ease }}
                                className="flex flex-col items-center text-center"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
                                    className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground"
                                >
                                    <Check className="size-8" />
                                </motion.div>
                                <h2 className="mt-6 text-2xl font-semibold tracking-tight text-balance">
                                    {userName ? `¡Todo listo, ${userName}!` : "¡Todo listo!"}
                                </h2>
                                <p className="mt-2 text-muted-foreground text-pretty">
                                    Flux está preparado. Redirigiendo a la interfaz principal...
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {isFirstTime && (
                <footer className="flex h-16 shrink-0 items-center justify-center">
                    <StepIndicator total={TOTAL_STEPS} current={step} />
                </footer>
            )}
        </div>
    )
}
