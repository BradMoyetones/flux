"use client"

import { SectionCard, SettingRow } from "@/modules/settings/ui/components/controls"
import { useUserStore } from "@/shared/stores/user-store";
import { Switch } from "@/ui/components/ui/switch"

export function SystemSection() {
    const { runInBackground, setRunInBackground } = useUserStore();

    return (
        <div className="space-y-5">
            <SectionCard title="Inicio">
                <SettingRow
                    title="Ejecutar en segundo plano"
                    description="Al cerrar la ventana, la aplicación permanecerá activa en el menú del sistema (System Tray) para procesar tus flujos."
                >
                    <Switch checked={runInBackground} onCheckedChange={setRunInBackground} />
                </SettingRow>
            </SectionCard>
        </div>
    )
}