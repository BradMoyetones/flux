"use client"

import { useRef } from "react"
import type { UserProfile } from "@/modules/settings/lib/settings-types"
import { Field, SectionCard, SettingRow, Switch, TextArea, TextInput } from "@/modules/settings/ui/components/controls"
import { Button } from "@/ui/components/ui/button"
import { Camera, RotateCcw, Sparkles } from "lucide-react"

export function GeneralSection({
    profile,
    onChange,
}: {
    profile: UserProfile
    onChange: (patch: Partial<UserProfile>) => void
}) {
    const fileRef = useRef<HTMLInputElement>(null)

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (file) onChange({ avatarUrl: URL.createObjectURL(file) })
    }

    return (
        <div className="space-y-5">
            {/* Bienvenida / onboarding */}
            <div className="relative overflow-hidden rounded-xl border border-(--primary)/25 bg-(--primary)/8 px-5 py-4">
                <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--primary)/15 text-(--primary)">
                        <Sparkles className="size-4.5" />
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-foreground">
                            ¡Hola de nuevo, {profile.displayName || "usuario"}!
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Personaliza cómo quieres que la app te salude y se dirija a ti. Estos datos se
                            guardan localmente en tu equipo.
                        </p>
                    </div>
                </div>
            </div>

            <SectionCard title="Perfil" description="Cómo te identificas dentro de Flux.">
                <div className="flex flex-col gap-6 sm:flex-row">
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative">
                            <img
                                src={profile.avatarUrl || "/avatar-default.png"}
                                alt="Foto de perfil"
                                width={88}
                                height={88}
                                className="size-22 rounded-2xl border border-border object-cover"
                            />
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="absolute -bottom-1.5 -right-1.5 flex size-7 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-muted"
                                aria-label="Cambiar foto"
                            >
                                <Camera className="size-3.5" />
                            </button>
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                        <span className="text-[11px] text-muted-foreground">PNG · JPG</span>
                    </div>

                    {/* Campos */}
                    <div className="grid flex-1 gap-4 sm:grid-cols-2">
                        <Field label="¿Cómo quieres que te llamemos?" htmlFor="displayName" className="sm:col-span-2">
                            <TextInput
                                id="displayName"
                                value={profile.displayName}
                                placeholder="p. ej. Brad"
                                onChange={(e) => onChange({ displayName: e.target.value })}
                            />
                        </Field>
                        <Field label="Usuario" htmlFor="handle">
                            <TextInput
                                id="handle"
                                value={profile.handle}
                                onChange={(e) => onChange({ handle: e.target.value })}
                            />
                        </Field>
                        <Field label="Correo" htmlFor="email">
                            <TextInput
                                id="email"
                                type="email"
                                value={profile.email}
                                onChange={(e) => onChange({ email: e.target.value })}
                            />
                        </Field>
                        <Field label="Sobre ti" htmlFor="bio" className="sm:col-span-2" hint="Se muestra en tu tarjeta de perfil.">
                            <TextArea
                                id="bio"
                                value={profile.bio}
                                onChange={(e) => onChange({ bio: e.target.value })}
                            />
                        </Field>
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="Inicio">
                <div className="divide-y divide-border">
                    <SettingRow
                        title="Onboarding completado"
                        description="Marca si ya pasaste por la bienvenida inicial."
                    >
                        <Switch
                            checked={profile.onboardingCompleted}
                            onCheckedChange={(v) => onChange({ onboardingCompleted: v })}
                        />
                    </SettingRow>
                    <SettingRow
                        title="Repetir bienvenida"
                        description="Vuelve a mostrar el asistente de bienvenida en el próximo arranque."
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onChange({ onboardingCompleted: false })}
                        >
                            <RotateCcw className="size-3.5" />
                            Reiniciar
                        </Button>
                    </SettingRow>
                </div>
            </SectionCard>
        </div>
    )
}
