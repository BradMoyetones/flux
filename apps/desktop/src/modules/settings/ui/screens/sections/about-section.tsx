"use client"

import { SectionCard, SettingRow } from "@/modules/settings/ui/components/controls"
import { Button } from "@flux/ui"
import { useUpdater } from "@/ui/hooks/use-updater"
import { BookOpen, Bug, Code2, FileText, RefreshCw } from "lucide-react"
import { useState } from "react";
import { APP_CONFIG } from "@/config/app"

import { Update } from '@tauri-apps/plugin-updater';
import { toast } from 'sonner';
import { useTabs } from "@/shared/contexts/tabs-context"
import { useNavigate } from "react-router"

export function AboutSection() {
    const { appVersion, tauriVersion, checkForUpdates, promptUpdate } = useUpdater()
    const { openTab } = useTabs()
    const navigate = useNavigate()

    const [isChecking, setIsChecking] = useState(false);
    const [update, setUpdate] = useState<Update | null>(null);

    const handleCheckUpdates = async () => {
        if (update) {
            promptUpdate(update);
            return;
        }

        setIsChecking(true);
        const newUpdate = await checkForUpdates();
        setIsChecking(false);

        if (newUpdate) {
            setUpdate(newUpdate);
        } else {
            toast.success("Ya tienes la última versión instalada.");
        }
    }

    const handleOpenReleaseNotes = async () => {
        openTab("/release-notes")
        navigate("/release-notes")
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
                <img
                    src="/app-icon.svg"
                    alt="Flux"
                    className="size-12"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                />
                <div>
                    <p className="text-base font-semibold text-foreground">Flux</p>
                    <p className="text-xs text-muted-foreground">
                        Automatización de flujos local · versión {appVersion} ({tauriVersion})
                    </p>
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-auto" 
                    onClick={handleCheckUpdates}
                    disabled={isChecking}
                >
                    <RefreshCw className={isChecking ? "animate-spin" : ""} />
                    {isChecking ? "Buscando..." : update ? "Iniciar proceso de instalación" : "Buscar actualizaciones"}
                </Button>
            </div>

            <SectionCard title="Sistema">
                <div className="divide-y divide-border">
                    <SettingRow title="Versión" description="Canal estable.">
                        <span className="font-mono text-xs text-foreground">{appVersion}</span>
                    </SettingRow>
                    <SettingRow title="Build" description="Runtime Tauri + sidecar Go.">
                        <span className="font-mono text-xs text-foreground">{tauriVersion}</span>
                    </SettingRow>
                </div>
            </SectionCard>

            <SectionCard title="Recursos">
                <div className="grid gap-2 sm:grid-cols-4">
                    <Button variant="outline" size="sm" className="justify-start" asChild>
                        <a target="_blank" rel="noopener noreferrer" href={APP_CONFIG.getDocumentationUrl()}>
                            <BookOpen />
                            Documentación
                        </a>
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start" asChild>
                        <a target="_blank" rel="noopener noreferrer" href={APP_CONFIG.getRepoUrl()}>
                        <Code2 />
                        Repositorio
                        </a>
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start" asChild>
                        <a target="_blank" rel="noopener noreferrer" href={APP_CONFIG.getReportBugUrl()}>
                            <Bug />
                            Reportar un bug
                        </a>
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start" onClick={handleOpenReleaseNotes}>
                        <FileText />
                        Nota de release
                    </Button>
                </div>
            </SectionCard>
        </div>
    )
}
