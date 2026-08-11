"use client"

import { useState } from "react"
import { Field, SectionCard, SettingRow, Switch, TextInput } from "@/modules/settings/ui/components/controls"
import { Button } from "@/ui/components/ui/button"
import { Camera, RotateCcw, Save, Sparkles } from "lucide-react"
import { useUserStore } from "@/shared/stores/user-store"
import { open } from "@tauri-apps/plugin-dialog"
import { convertFileSrc, invoke } from "@tauri-apps/api/core"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/ui/tooltip"

export function GeneralSection() {
    const { userName, avatarPath, isFirstTime, setIsFirstTime, setAvatarPath, setUserName } = useUserStore();
    const [name, setName] = useState(userName)

    const handleAvatarUpload = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{
                    name: 'Image',
                    extensions: ['png', 'jpeg', 'jpg', 'gif', 'webp']
                }]
            });
            if (selected) {
                const path = typeof selected === 'string' ? selected : (selected as any).path;
                if (!path) return;

                const newPath = await invoke<string>('process_and_save_avatar', { filePath: path });
                setAvatarPath(newPath);
            }
        } catch (e) {
            console.error('Failed to upload avatar:', e);
        }
    };

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
                            ¡Hola de nuevo, {userName}!
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
                                src={convertFileSrc(avatarPath)}
                                alt="Foto de perfil"
                                width={88}
                                height={88}
                                className="size-22 rounded-2xl border border-border object-cover"
                            />
                            <button
                                type="button"
                                onClick={handleAvatarUpload}
                                className="absolute -bottom-1.5 -right-1.5 flex size-7 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-muted"
                                aria-label="Cambiar foto"
                            >
                                <Camera className="size-3.5" />
                            </button>
                        </div>
                        <span className="text-[11px] text-muted-foreground">PNG · JPG</span>
                    </div>

                    {/* Campos */}
                    <div className="grid flex-1 gap-4 sm:grid-cols-2">
                        <Field label="¿Cómo quieres que te llamemos?" htmlFor="displayName" className="sm:col-span-2">
                            <div className="relative">
                                <TextInput
                                    id="displayName"
                                    value={name}
                                    placeholder="p. ej. Brad"
                                    onChange={(e) => setName(e.target.value)}
                                />
                                {name !== userName && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                className="absolute right-1 top-1"
                                                variant="outline"
                                                size="icon-sm"
                                                onClick={() => {
                                                    setUserName(name);
                                                }}
                                            >
                                                <Save />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Guardar</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </div>
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
                            checked={!isFirstTime}
                            onCheckedChange={() => setIsFirstTime(!isFirstTime)}
                        />
                    </SettingRow>
                    <SettingRow
                        title="Repetir bienvenida"
                        description="Vuelve a mostrar el asistente de bienvenida en el próximo arranque."
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsFirstTime(true)}
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
