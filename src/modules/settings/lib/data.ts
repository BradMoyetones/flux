import { Bell, FolderTree, Info, LucideIcon, MessageCircle, Palette, Sliders, User } from "lucide-react"

export type SectionId =
    | "general"
    | "appearance"
    | "workspaces"
    | "whatsapp"
    | "automation"
    | "notifications"
    | "about"

export const NAV: {
    id: SectionId
    label: string
    icon: LucideIcon
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


export const SECTION_TITLES: Record<SectionId, { title: string; subtitle: string }> = {
    general: { title: "General", subtitle: "Tu perfil y la bienvenida de la app." },
    appearance: { title: "Apariencia", subtitle: "Tema, color de acento y densidad de la interfaz." },
    workspaces: { title: "Workspaces", subtitle: "Configura cada workspace y sus flujos." },
    whatsapp: { title: "Sesiones de WhatsApp", subtitle: "Gestiona y recicla las conexiones del sidecar." },
    automation: { title: "Automatización", subtitle: "Valores por defecto de nodos y variables globales." },
    notifications: { title: "Notificaciones", subtitle: "Controla qué eventos te avisan." },
    about: { title: "Acerca de", subtitle: "Información de versión y recursos." },
}