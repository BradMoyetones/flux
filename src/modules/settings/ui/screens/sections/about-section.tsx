"use client"

import { SectionCard, SettingRow } from "@/modules/settings/ui/components/controls"
import { Button } from "@/ui/components/ui/button"
import { useUpdater } from "@/ui/hooks/use-updater"
import { BookOpen, Bug, Code2, RefreshCw, Workflow } from "lucide-react"
import { getTauriVersion } from '@tauri-apps/api/app';
import { useState } from "react";
import { APP_CONFIG } from "@/shared/config/app"
import { check } from '@tauri-apps/plugin-updater';

export function AboutSection() {
    const { appVersion } = useUpdater()
    const [tauriVersion] = useState(getTauriVersion().then((v) => {
        return v;
    }).catch(() => {
        return "Unknown";
    }));

    const checkUpdates = async() => {
        const update = await check();
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
                <Button variant="outline" size="sm" className="ml-auto" onClick={() => { }}>
                    <RefreshCw />
                    Buscar actualizaciones
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
                <div className="grid gap-2 sm:grid-cols-3">
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
                </div>
            </SectionCard>
        </div>
    )
}
