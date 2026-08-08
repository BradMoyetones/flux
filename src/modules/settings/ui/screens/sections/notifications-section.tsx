"use client"

import type { NotificationConfig } from "@/modules/settings/lib/settings-types"
import { SectionCard, SettingRow, Switch } from "@/modules/settings/ui/components/controls"

export function NotificationsSection({
    config,
    onChange,
}: {
    config: NotificationConfig
    onChange: (patch: Partial<NotificationConfig>) => void
}) {
    const disabled = !config.desktopEnabled
    return (
        <div className="space-y-5">
            <SectionCard title="Notificaciones de escritorio">
                <SettingRow
                    title="Activar notificaciones"
                    description="Permite que Flux envíe notificaciones nativas del sistema."
                >
                    <Switch checked={config.desktopEnabled} onCheckedChange={(v) => onChange({ desktopEnabled: v })} />
                </SettingRow>
            </SectionCard>

            <SectionCard title="Eventos" description="Elige qué eventos disparan una notificación.">
                <div className="divide-y divide-border">
                    <SettingRow title="Flujo ejecutado con éxito">
                        <Switch disabled={disabled} checked={config.onFlowSuccess} onCheckedChange={(v) => onChange({ onFlowSuccess: v })} />
                    </SettingRow>
                    <SettingRow title="Flujo con error">
                        <Switch disabled={disabled} checked={config.onFlowError} onCheckedChange={(v) => onChange({ onFlowError: v })} />
                    </SettingRow>
                    <SettingRow title="Sesión de WhatsApp desconectada">
                        <Switch disabled={disabled} checked={config.onSessionDisconnect} onCheckedChange={(v) => onChange({ onSessionDisconnect: v })} />
                    </SettingRow>
                </div>
            </SectionCard>

            <SectionCard title="Preferencias">
                <div className="divide-y divide-border">
                    <SettingRow title="Sonido" description="Reproduce un sonido con cada notificación.">
                        <Switch disabled={disabled} checked={config.sound} onCheckedChange={(v) => onChange({ sound: v })} />
                    </SettingRow>
                    <SettingRow title="Horario de silencio" description="Silencia notificaciones entre 22:00 y 07:00.">
                        <Switch disabled={disabled} checked={config.quietHours} onCheckedChange={(v) => onChange({ quietHours: v })} />
                    </SettingRow>
                </div>
            </SectionCard>
        </div>
    )
}
