"use client"

import { useState } from "react"
import { SectionCard, SettingRow } from "@/modules/settings/ui/components/controls"
import { useUserStore } from "@/shared/stores/user-store";
import { Switch } from "@/ui/components/ui/switch"
import { Button } from "@/ui/components/ui/button"
import { invoke } from "@tauri-apps/api/core"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/ui/components/ui/alert-dialog"
import { AlertTriangle, Loader2 } from "lucide-react"

export function SystemSection() {
    const { runInBackground, setRunInBackground } = useUserStore();
    const [isResetting, setIsResetting] = useState(false);

    const handleReset = async (restart: boolean) => {
        setIsResetting(true);
        try {
            await invoke("cmd_factory_reset", { restart });
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

            <SectionCard title="Zona de Peligro" description="Acciones destructivas y de restablecimiento.">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-medium text-destructive">Resetear Aplicación</h4>
                        <p className="text-[13px] text-muted-foreground mt-1 max-w-[80%]">
                            Elimina toda la configuración, sesiones de WhatsApp y cachés.
                        </p>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isResetting}>
                                {isResetting ? <Loader2 className="size-4 animate-spin mr-2" /> : <AlertTriangle className="size-4 mr-2" />}
                                Resetear
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción eliminará toda la configuración, credenciales y sesiones de la aplicación.
                                    <strong> Esta acción no se puede deshacer.</strong> Tus archivos de flujo (.flux) y Workspaces en disco no serán eliminados.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="sm:justify-between">
                                <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
                                <div className="flex gap-2">
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
                                </div>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </SectionCard>
        </div>
    )
}