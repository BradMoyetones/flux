import type { Variants, Transition } from "motion/react"

/** Curva suave compartida para todas las transiciones del onboarding. */
export const ease: Transition["ease"] = [0.22, 1, 0.36, 1]

/** Contenedor que revela sus hijos de forma escalonada (no todo a la vez). */
export const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            duration: 0.3,
            ease,
            staggerChildren: 0.08,
            delayChildren: 0.05,
        },
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.2, ease },
    },
}

/** Cada elemento entra desde abajo con un ligero desplazamiento. */
export const itemVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease } },
}

/** Transición horizontal entre pasos según la dirección de navegación. */
export const stepVariants: Variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
}
