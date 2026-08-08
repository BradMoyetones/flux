"use client"

import { useTheme } from "next-themes"
import type { AccentColor, AppearanceConfig, ThemeMode, UiDensity } from "@/modules/settings/lib/settings-types"
import { Field, SectionCard, SegmentedControl, SettingRow, Switch } from "@/modules/settings/ui/components/controls"
import { Monitor, Moon, Sun } from "lucide-react"
import { cn } from "@/shared/utils/utils"

const ACCENTS: { value: AccentColor; label: string; swatch: string }[] = [
    { value: "violet", label: "Violeta", swatch: "oklch(0.55 0.22 285)" },
    { value: "blue", label: "Azul", swatch: "oklch(0.55 0.18 250)" },
    { value: "emerald", label: "Esmeralda", swatch: "oklch(0.6 0.15 160)" },
    { value: "amber", label: "Ámbar", swatch: "oklch(0.68 0.16 65)" },
    { value: "rose", label: "Rosa", swatch: "oklch(0.62 0.2 15)" },
]

export function AppearanceSection({
    appearance,
    onChange,
}: {
    appearance: AppearanceConfig
    onChange: (patch: Partial<AppearanceConfig>) => void
}) {
    const { setTheme } = useTheme()

    function setThemeMode(mode: ThemeMode) {
        onChange({ theme: mode })
        setTheme(mode)
    }

    return (
        <div className="space-y-5">
            <SectionCard title="Tema" description="Elige el aspecto de la aplicación.">
                <Field label="Modo de color">
                    <SegmentedControl<ThemeMode>
                        value={appearance.theme}
                        onChange={setThemeMode}
                        options={[
                            { value: "light", label: "Claro", icon: <Sun className="size-3.5" /> },
                            { value: "dark", label: "Oscuro", icon: <Moon className="size-3.5" /> },
                            { value: "system", label: "Sistema", icon: <Monitor className="size-3.5" /> },
                        ]}
                    />
                </Field>

                <div className="mt-5">
                    <Field label="Color de acento" hint="Define el color principal de resaltado en toda la app.">
                        <div className="flex flex-wrap gap-2">
                            {ACCENTS.map((a) => {
                                const active = appearance.accent === a.value
                                return (
                                    <button
                                        key={a.value}
                                        type="button"
                                        onClick={() => onChange({ accent: a.value })}
                                        className={cn(
                                            "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                                            active
                                                ? "border-foreground/30 bg-muted text-foreground"
                                                : "border-border text-muted-foreground hover:bg-muted",
                                        )}
                                    >
                                        <span
                                            className="size-3.5 rounded-full ring-2 ring-background"
                                            style={{ backgroundColor: a.swatch, boxShadow: active ? `0 0 0 2px ${a.swatch}` : undefined }}
                                        />
                                        {a.label}
                                    </button>
                                )
                            })}
                        </div>
                    </Field>
                </div>
            </SectionCard>

            <SectionCard title="Interfaz">
                <div className="divide-y divide-border">
                    <SettingRow title="Densidad" description="Compacta reduce el espaciado de listas y paneles.">
                        <SegmentedControl<UiDensity>
                            value={appearance.density}
                            onChange={(v) => onChange({ density: v })}
                            options={[
                                { value: "comfortable", label: "Cómoda" },
                                { value: "compact", label: "Compacta" },
                            ]}
                        />
                    </SettingRow>
                    <SettingRow title="Colapsar barra lateral al iniciar" description="Abre la app con el menú lateral minimizado.">
                        <Switch
                            checked={appearance.sidebarCollapsed}
                            onCheckedChange={(v) => onChange({ sidebarCollapsed: v })}
                        />
                    </SettingRow>
                    <SettingRow title="Fuente monoespaciada en el editor" description="Usa Geist Mono para configs y expresiones {{ }}.">
                        <Switch
                            checked={appearance.monoEditorFont}
                            onCheckedChange={(v) => onChange({ monoEditorFont: v })}
                        />
                    </SettingRow>
                    <SettingRow title="Reducir movimiento" description="Minimiza animaciones y transiciones.">
                        <Switch
                            checked={appearance.reduceMotion}
                            onCheckedChange={(v) => onChange({ reduceMotion: v })}
                        />
                    </SettingRow>
                </div>
            </SectionCard>
        </div>
    )
}
