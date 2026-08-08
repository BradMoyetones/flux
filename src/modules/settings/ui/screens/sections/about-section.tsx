"use client"

import { APP_BUILD, APP_VERSION } from "@/modules/settings/lib/settings-data"
import { SectionCard, SettingRow } from "@/modules/settings/ui/components/controls"
import { Button } from "@/ui/components/ui/button"
import { BookOpen, Bug, Code2, RefreshCw, Workflow } from "lucide-react"

export function AboutSection() {
    return (
        <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
                <div className="flex size-12 items-center justify-center rounded-xl bg-(--primary) text-white">
                    <Workflow className="size-6" />
                </div>
                <div>
                    <p className="text-base font-semibold text-foreground">Flux</p>
                    <p className="text-xs text-muted-foreground">
                        Automatización de flujos local · versión {APP_VERSION} ({APP_BUILD})
                    </p>
                </div>
                <Button variant="outline" size="sm" className="ml-auto">
                    <RefreshCw className="size-3.5" />
                    Buscar actualizaciones
                </Button>
            </div>

            <SectionCard title="Sistema">
                <div className="divide-y divide-border">
                    <SettingRow title="Versión" description="Canal estable.">
                        <span className="font-mono text-xs text-foreground">{APP_VERSION}</span>
                    </SettingRow>
                    <SettingRow title="Build" description="Runtime Tauri + sidecar Go.">
                        <span className="font-mono text-xs text-foreground">{APP_BUILD}</span>
                    </SettingRow>
                    <SettingRow title="Motor" description="Ejecución local de flujos.">
                        <span className="font-mono text-xs text-foreground">flux-engine v2</span>
                    </SettingRow>
                </div>
            </SectionCard>

            <SectionCard title="Recursos">
                <div className="grid gap-2 sm:grid-cols-3">
                    <Button variant="outline" size="sm" className="justify-start">
                        <BookOpen className="size-3.5" />
                        Documentación
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start">
                        <Code2 className="size-3.5" />
                        Repositorio
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start">
                        <Bug className="size-3.5" />
                        Reportar un bug
                    </Button>
                </div>
            </SectionCard>
        </div>
    )
}
