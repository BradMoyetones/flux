"use client"

import { useMemo, useState } from "react"
import { Input } from "@/ui/components/ui/input"
import {
    Search,
} from "lucide-react"

import { GeneralSection } from "./sections/general-section"
import { AppearanceSection } from "./sections/appearance-section"
import { WhatsAppSection } from "./sections/whatsapp-section"
import { AutomationSection } from "./sections/automation-section"
import { NotificationsSection } from "./sections/notifications-section"
import { AboutSection } from "./sections/about-section"
import { cn } from "@/shared/utils/utils"
import { useUserStore } from "@/shared/stores/user-store"
import { convertFileSrc } from "@tauri-apps/api/core"
import { SectionId, NAV, SECTION_TITLES } from "../../lib/data"
import { WorkspacesSection } from "./sections/workspaces-section"
import { SystemSection } from "./sections/system-section"

export default function SettingsView() {
    const [active, setActive] = useState<SectionId>("general")
    const [query, setQuery] = useState("")

    // Estado (mock) — así se vería la config persistida por la app
    const {avatarPath, userName} = useUserStore();

    const filteredNav = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return NAV
        return NAV.filter(
            (n) => n.label.toLowerCase().includes(q) || n.keywords.some((k) => k.includes(q)),
        )
    }, [query])

    // Agrupa nav por "group"
    const grouped = useMemo(() => {
        const map = new Map<string, typeof NAV>()
        for (const item of filteredNav) {
            if (!map.has(item.group)) map.set(item.group, [])
            map.get(item.group)!.push(item)
        }
        return Array.from(map.entries())
    }, [filteredNav])

    return (
        <div className="flex h-full! flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1">
                {/* Nav lateral estilo Discord */}
                <nav className="flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
                    <div className="p-3">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Buscar ajustes…"
                                className="h-8 bg-background pl-8 text-[13px]"
                                aria-label="Buscar ajustes"
                            />
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 pb-3">
                        {grouped.length === 0 && (
                            <p className="px-3 py-6 text-center text-xs text-muted-foreground">Sin resultados</p>
                        )}
                        {grouped.map(([group, items]) => (
                            <div key={group}>
                                <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {group}
                                </p>
                                <ul className="space-y-0.5">
                                    {items.map((item) => {
                                        const Icon = item.icon
                                        const isActive = active === item.id
                                        return (
                                            <li key={item.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => setActive(item.id)}
                                                    className={cn(
                                                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-sm transition-colors",
                                                        isActive
                                                            ? "bg-primary/12 font-medium text-primary border border-primary/30"
                                                            : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent",
                                                    )}
                                                >
                                                    <Icon className="size-4 shrink-0" />
                                                    {item.label}
                                                </button>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>

                    {/* Tarjeta de usuario */}
                    <div className="flex items-center gap-2.5 border-t border-border p-3">
                        <img
                            src={convertFileSrc(avatarPath)}
                            alt=""
                            className="size-8 rounded-lg object-cover"
                        />
                        <div className="min-w-0 leading-tight">
                            <p className="truncate text-sm font-medium text-foreground">{userName}</p>
                        </div>
                    </div>
                </nav>

                {/* Contenido */}
                <main className="min-w-0 flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-3xl px-6 py-6">
                        <div className="mb-5">
                            <h1 className="text-lg font-semibold text-foreground">{SECTION_TITLES[active].title}</h1>
                            <p className="text-sm text-muted-foreground">{SECTION_TITLES[active].subtitle}</p>
                        </div>

                        {active === "general" && (
                            <GeneralSection />
                        )}
                        {active === "appearance" && (
                            <AppearanceSection />
                        )}
                        {active === "workspaces" && (
                            <WorkspacesSection />
                        )}
                        {active === "whatsapp" && (
                            <WhatsAppSection />
                        )}
                        {active === "automation" && (
                            <AutomationSection />
                        )}
                        {active === "notifications" && (
                            <NotificationsSection />
                        )}
                        {active === "system" && (
                            <SystemSection />
                        )}
                        {active === "about" && <AboutSection />}
                    </div>
                </main>
            </div>
        </div>
    )
}
