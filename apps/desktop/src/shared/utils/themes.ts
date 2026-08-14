export type UiDensity = "comfortable" | "compact"

export type ColorTheme = "violet" | "blue" | "emerald" | "amber" | "rose" | ""

export const COLORS: { value: ColorTheme; label: string; swatch: string }[] = [
    { value: "", label: "Por defecto", swatch: "oklch(0.65 0.18 45)" },
    { value: "violet", label: "Violeta", swatch: "oklch(0.55 0.22 285)" },
    { value: "blue", label: "Azul", swatch: "oklch(0.55 0.18 250)" },
    { value: "emerald", label: "Esmeralda", swatch: "oklch(0.6 0.15 160)" },
    { value: "amber", label: "Ámbar", swatch: "oklch(0.68 0.16 65)" },
    { value: "rose", label: "Rosa", swatch: "oklch(0.62 0.2 15)" },
]