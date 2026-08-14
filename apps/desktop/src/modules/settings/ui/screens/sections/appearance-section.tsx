"use client"

import { useTheme, UseThemeProps } from "next-themes"
import { Field, SectionCard, SegmentedControl, SettingRow } from "@/modules/settings/ui/components/controls"
import { Monitor, Moon, Sun } from "lucide-react"
import { cn } from "@/shared/utils/utils"
import { useColorTheme } from "@/shared/contexts/color-theme-provider"
import { COLORS, UiDensity } from "@/shared/utils/themes"

export function AppearanceSection() {
    const { setTheme, theme } = useTheme()
    const { colorTheme, setColorTheme } = useColorTheme()

    return (
        <div className="space-y-5">
            <SectionCard title="Tema" description="Elige el aspecto de la aplicación.">
                <Field label="Modo de color" className="flex flex-col">
                    <SegmentedControl<UseThemeProps["theme"]>
                        value={theme}
                        onChange={setTheme}
                        className="w-fit"
                        options={[
                            { value: "light", label: "Claro", icon: <Sun className="size-3.5" /> },
                            { value: "dark", label: "Oscuro", icon: <Moon className="size-3.5" /> },
                            { value: "system", label: "Sistema", icon: <Monitor className="size-3.5" /> },
                        ]}
                    />
                </Field>

                <div className="mt-5">
                    <Field label="Color de acento" hint="Define el color principal de resaltado en toda la app." className="flex flex-col">
                        <div className="flex flex-wrap gap-2">
                            {COLORS.map((a) => {
                                const active = colorTheme === a.value
                                return (
                                    <button
                                        key={a.value}
                                        type="button"
                                        onClick={() => setColorTheme(a.value)}
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
                            value={"comfortable"}
                            onChange={() => { }}
                            options={[
                                { value: "comfortable", label: "Cómoda" },
                                { value: "compact", label: "Compacta" },
                            ]}
                        />
                    </SettingRow>
                </div>
            </SectionCard>
        </div>
    )
}
