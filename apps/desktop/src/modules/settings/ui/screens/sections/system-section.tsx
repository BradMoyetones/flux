"use client"

import { useState } from "react"
import { SectionCard, SettingRow } from "@/modules/settings/ui/components/controls"
import { useUserStore } from "@/shared/stores/user-store";
import { Switch } from "@/ui/components/ui/switch"
import { Button } from "@/ui/components/ui/button"
import { api } from "@flux/api"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/ui/components/ui/dialog"
import { AlertTriangle } from "lucide-react"
import { Spinner } from "@/ui/components/ui/spinner";

export function SystemSection() {
    const { runInBackground, setRunInBackground } = useUserStore();
    const [isResetting, setIsResetting] = useState(false);

    const handleReset = async (restart: boolean) => {
        setIsResetting(true);
        try {
            await api.config.factoryReset(restart);
        } catch (e) {
            console.error("Error al resetear la aplicación:", e);
            setIsResetting(false);
        }
    };

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

            <SectionCard title="Zona de Peligro" description="Acciones destructivas y de restablecimiento." className="bg-destructive/5 border-destructive/60">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-medium text-destructive">Resetear Aplicación</h4>
                        <p className="text-[13px] text-muted-foreground mt-1 max-w-[80%]">
                            Elimina toda la configuración, sesiones de WhatsApp y cachés.
                        </p>
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isResetting}>
                                {isResetting ? <Spinner /> : <AlertTriangle />}
                                Resetear
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>¿Estás completamente seguro?</DialogTitle>
                                <DialogDescription>
                                    Esta acción eliminará toda la configuración, credenciales y sesiones de la aplicación.
                                    <strong> Esta acción no se puede deshacer.</strong> Tus archivos de flujo (.flux) y Workspaces en disco no serán eliminados.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                    <Button 
                                        variant="outline" 
                                        disabled={isResetting} 
                                        onClick={() => handleReset(false)}
                                    >
                                        Resetear y Cerrar
                                    </Button>
                                    <Button 
                                        variant="destructive" 
                                        disabled={isResetting} 
                                        onClick={() => handleReset(true)}
                                    >
                                        Resetear y Reiniciar
                                    </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </SectionCard>
        </div>
    )
}