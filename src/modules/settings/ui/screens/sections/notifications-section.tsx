"use client"

import { useState } from "react"
import { SectionCard, SettingRow } from "@/modules/settings/ui/components/controls"
import { useUserStore } from "@/shared/stores/user-store"
import { Switch } from "@/ui/components/ui/switch"
import { Button } from "@/ui/components/ui/button"
import { invoke } from "@tauri-apps/api/core"
import { Bell, Loader2 } from "lucide-react"

export function NotificationsSection() {
    const { notifications, updateNotificationConfig } = useUserStore();
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<string | null>(null);

    const handleTestNotification = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            await invoke('cmd_test_notification');
            setTestResult('success');
        } catch (e) {
            console.error('Test notification failed:', e);
            setTestResult('error');
        } finally {
            setTesting(false);
            setTimeout(() => setTestResult(null), 3000);
        }
    };

    return (
        <div className="space-y-5">
            <SectionCard title="Notificaciones de escritorio">
                <SettingRow
                    title="Activar notificaciones"
                    description="Permite que Flux envíe notificaciones nativas del sistema."
                >
                    <Switch
                        checked={notifications.desktopEnabled}
                        onCheckedChange={(val) => updateNotificationConfig({ desktopEnabled: val })}
                    />
                </SettingRow>
            </SectionCard>

            <SectionCard title="Eventos" description="Elige qué eventos disparan una notificación.">
                <div className="divide-y divide-border">
                    <SettingRow title="Flujo ejecutado con éxito">
                        <Switch
                            checked={notifications.onFlowSuccess}
                            onCheckedChange={(val) => updateNotificationConfig({ onFlowSuccess: val })}
                        />
                    </SettingRow>
                    <SettingRow title="Flujo con error">
                        <Switch
                            checked={notifications.onFlowError}
                            onCheckedChange={(val) => updateNotificationConfig({ onFlowError: val })}
                        />
                    </SettingRow>
                    <SettingRow title="Sesión de WhatsApp desconectada">
                        <Switch
                            checked={notifications.onSessionDisconnect}
                            onCheckedChange={(val) => updateNotificationConfig({ onSessionDisconnect: val })}
                        />
                    </SettingRow>
                </div>
            </SectionCard>

            <SectionCard title="Preferencias">
                <div className="divide-y divide-border">
                    <SettingRow title="Sonido" description="Reproduce un sonido con cada notificación.">
                        <Switch
                            checked={notifications.sound}
                            onCheckedChange={(val) => updateNotificationConfig({ sound: val })}
                        />
                    </SettingRow>
                    <SettingRow title="Horario de silencio" description="Silencia notificaciones entre 22:00 y 07:00.">
                        <Switch
                            checked={notifications.quietHours}
                            onCheckedChange={(val) => updateNotificationConfig({ quietHours: val })}
                        />
                    </SettingRow>
                </div>
            </SectionCard>

            <SectionCard title="Prueba" description="Verifica que las notificaciones se muestren correctamente en tu sistema operativo.">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTestNotification}
                        disabled={testing || !notifications.desktopEnabled}
                    >
                        {testing ? (
                            <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                            <Bell className="size-3.5" />
                        )}
                        {testing ? 'Enviando…' : 'Probar notificaciones'}
                    </Button>
                    {testResult === 'success' && (
                        <span className="text-xs text-emerald-500 font-medium animate-in fade-in">
                            ✓ Notificación enviada
                        </span>
                    )}
                    {testResult === 'error' && (
                        <span className="text-xs text-destructive font-medium animate-in fade-in">
                            ✗ Error al enviar
                        </span>
                    )}
                </div>
                {!notifications.desktopEnabled && (
                    <p className="mt-2 text-xs text-muted-foreground">
                        Activa las notificaciones de escritorio para poder probarlas.
                    </p>
                )}
            </SectionCard>
        </div>
    )
}
