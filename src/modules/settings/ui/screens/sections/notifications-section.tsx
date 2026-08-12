"use client"

import { SectionCard, SettingRow } from "@/modules/settings/ui/components/controls"
import { Switch } from "@/ui/components/ui/switch"

export function NotificationsSection() {
    return (
        <div className="space-y-5">
            <SectionCard title="Notificaciones de escritorio">
                <SettingRow
                    title="Activar notificaciones"
                    description="Permite que Flux envíe notificaciones nativas del sistema."
                >
                    <Switch />
                </SettingRow>
            </SectionCard>

            <SectionCard title="Eventos" description="Elige qué eventos disparan una notificación.">
                <div className="divide-y divide-border">
                    <SettingRow title="Flujo ejecutado con éxito">
                        <Switch />
                    </SettingRow>
                    <SettingRow title="Flujo con error">
                        <Switch />
                    </SettingRow>
                    <SettingRow title="Sesión de WhatsApp desconectada">
                        <Switch />
                    </SettingRow>
                </div>
            </SectionCard>

            <SectionCard title="Preferencias">
                <div className="divide-y divide-border">
                    <SettingRow title="Sonido" description="Reproduce un sonido con cada notificación.">
                        <Switch />
                    </SettingRow>
                    <SettingRow title="Horario de silencio" description="Silencia notificaciones entre 22:00 y 07:00.">
                        <Switch />
                    </SettingRow>
                </div>
            </SectionCard>
        </div>
    )
}
