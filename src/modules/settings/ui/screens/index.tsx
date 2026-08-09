"use client"

import { useMemo, useState } from "react"
import { Input } from "@/ui/components/ui/input"
import {
    Bell,
    Info,
    MessageCircle,
    Palette,
    Search,
    Sliders,
    User,
    FolderTree,
} from "lucide-react"

import {
    mockAutomation,
    mockGlobalVars,
    mockNotifications,
    mockProfile,
    mockSessions,
    mockWorkspaces,
} from "../../lib/settings-data"
import type {
    AutomationDefaults,
    GlobalVariable,
    NotificationConfig,
    UserProfile,
    WaSessionConfig,
    WorkflowConfig,
    WorkspaceConfig,
} from "../../lib/settings-types"

import { GeneralSection } from "./sections/general-section"
import { AppearanceSection } from "./sections/appearance-section"
import { WorkspacesSection } from "./sections/workspaces-section"
import { WhatsAppSection } from "./sections/whatsapp-section"
import { AutomationSection } from "./sections/automation-section"
import { NotificationsSection } from "./sections/notifications-section"
import { AboutSection } from "./sections/about-section"
import { cn } from "@/shared/utils/utils"

type SectionId =
    | "general"
    | "appearance"
    | "workspaces"
    | "whatsapp"
    | "automation"
    | "notifications"
    | "about"

const NAV: {
    id: SectionId
    label: string
    icon: typeof User
    group: string
    keywords: string[]
}[] = [
        { id: "general", label: "General", icon: User, group: "Cuenta", keywords: ["perfil", "nombre", "avatar", "bienvenida", "onboarding", "foto"] },
        { id: "appearance", label: "Apariencia", icon: Palette, group: "Cuenta", keywords: ["tema", "claro", "oscuro", "color", "acento", "densidad", "fuente"] },
        { id: "workspaces", label: "Workspaces", icon: FolderTree, group: "Automatización", keywords: ["flujo", "workflow", "cron", "nodos", "eliminar", "programado"] },
        { id: "whatsapp", label: "Sesiones WhatsApp", icon: MessageCircle, group: "Automatización", keywords: ["whatsapp", "sesion", "qr", "sidecar", "contactos", "chats", "reciclar"] },
        { id: "automation", label: "Automatización", icon: Sliders, group: "Automatización", keywords: ["http", "timeout", "reintentos", "ssl", "cookies", "variables", "global"] },
        { id: "notifications", label: "Notificaciones", icon: Bell, group: "Preferencias", keywords: ["notificacion", "alerta", "sonido", "escritorio"] },
        { id: "about", label: "Acerca de", icon: Info, group: "Preferencias", keywords: ["version", "build", "actualizar", "tauri"] },
    ]

const SECTION_TITLES: Record<SectionId, { title: string; subtitle: string }> = {
    general: { title: "General", subtitle: "Tu perfil y la bienvenida de la app." },
    appearance: { title: "Apariencia", subtitle: "Tema, color de acento y densidad de la interfaz." },
    workspaces: { title: "Workspaces", subtitle: "Configura cada workspace y sus flujos." },
    whatsapp: { title: "Sesiones de WhatsApp", subtitle: "Gestiona y recicla las conexiones del sidecar." },
    automation: { title: "Automatización", subtitle: "Valores por defecto de nodos y variables globales." },
    notifications: { title: "Notificaciones", subtitle: "Controla qué eventos te avisan." },
    about: { title: "Acerca de", subtitle: "Información de versión y recursos." },
}

export default function SettingsView() {
    const [active, setActive] = useState<SectionId>("general")
    const [query, setQuery] = useState("")

    // Estado (mock) — así se vería la config persistida por la app
    const [profile, setProfile] = useState<UserProfile>(mockProfile)
    const [workspaces, setWorkspaces] = useState<WorkspaceConfig[]>(mockWorkspaces)
    const [sessions, setSessions] = useState<WaSessionConfig[]>(mockSessions)
    const [automation, setAutomation] = useState<AutomationDefaults>(mockAutomation)
    const [vars, setVars] = useState<GlobalVariable[]>(mockGlobalVars)
    const [notifications, setNotifications] = useState<NotificationConfig>(mockNotifications)

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
                            src={profile.avatarUrl || "/avatar-default.png"}
                            alt=""
                            className="size-8 rounded-lg object-cover"
                        />
                        <div className="min-w-0 leading-tight">
                            <p className="truncate text-sm font-medium text-foreground">{profile.displayName}</p>
                            <p className="truncate text-[11px] text-muted-foreground">@{profile.handle}</p>
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
                            <GeneralSection profile={profile} onChange={(p) => setProfile((s) => ({ ...s, ...p }))} />
                        )}
                        {active === "appearance" && (
                            <AppearanceSection />
                        )}
                        {active === "workspaces" && (
                            <WorkspacesSection
                                workspaces={workspaces}
                                sessions={sessions}
                                onUpdateWorkspace={(wsId, patch) =>
                                    setWorkspaces((ws) => ws.map((w) => (w.id === wsId ? { ...w, ...patch } : w)))
                                }
                                onUpdateWorkflow={(wsId, wfId, patch) =>
                                    setWorkspaces((ws) =>
                                        ws.map((w) =>
                                            w.id === wsId
                                                ? {
                                                    ...w,
                                                    workflows: w.workflows.map((f) =>
                                                        f.id === wfId ? ({ ...f, ...patch } as WorkflowConfig) : f,
                                                    ),
                                                }
                                                : w,
                                        ),
                                    )
                                }
                                onDeleteWorkspace={(wsId) => setWorkspaces((ws) => ws.filter((w) => w.id !== wsId))}
                                onDeleteWorkflow={(wsId, wfId) =>
                                    setWorkspaces((ws) =>
                                        ws.map((w) =>
                                            w.id === wsId
                                                ? { ...w, workflows: w.workflows.filter((f) => f.id !== wfId) }
                                                : w,
                                        ),
                                    )
                                }
                            />
                        )}
                        {active === "whatsapp" && (
                            <WhatsAppSection
                                sessions={sessions}
                                workspaces={workspaces}
                                onUpdate={(id, patch) =>
                                    setSessions((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)))
                                }
                                onDelete={(id) => setSessions((ss) => ss.filter((s) => s.id !== id))}
                            />
                        )}
                        {active === "automation" && (
                            <AutomationSection
                                automation={automation}
                                vars={vars}
                                onChangeAutomation={(p) => setAutomation((s) => ({ ...s, ...p }))}
                                onChangeVars={setVars}
                            />
                        )}
                        {active === "notifications" && (
                            <NotificationsSection
                                config={notifications}
                                onChange={(p) => setNotifications((s) => ({ ...s, ...p }))}
                            />
                        )}
                        {active === "about" && <AboutSection />}
                    </div>
                </main>
            </div>
        </div>
    )
}
