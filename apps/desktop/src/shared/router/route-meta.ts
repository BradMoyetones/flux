import { File, House, Settings, Sparkles, Workflow, type LucideIcon } from 'lucide-react';

/**
 * Tabla de rutas SIN componentes (solo datos). Vive aparte de `tab-views.tsx` (que sí
 * importa las vistas) para que el estado de los tabs pueda validar rutas sin crear
 * dependencias circulares con las pantallas.
 *
 * Una "ruta" es la clave estable de un tab. Los patrones admiten UN parámetro
 * (`/flows/:pathId`) cuyo valor llega codificado con `encodeURIComponent`.
 */
export interface RouteMeta {
    /** Patrón de ruta. Ej: `/settings`, `/flows/:pathId`. */
    pattern: string;
    /** Título por defecto del tab. */
    title: string;
    icon?: LucideIcon;
    /** Home está fijado y no se puede cerrar. */
    closable: boolean;
}

export const HOME_PATH = '/';
export const FLOW_ROUTE_PATTERN = '/flows/:pathId';

/** Se usa cuando una ruta no define icono propio. */
export const FALLBACK_ICON: LucideIcon = File;

export const routeMetas: RouteMeta[] = [
    { pattern: HOME_PATH, title: 'Home', icon: House, closable: false },
    { pattern: '/release-notes', title: 'Notas de la versión', icon: Sparkles, closable: true },
    { pattern: FLOW_ROUTE_PATTERN, title: 'Flujo de Trabajo', icon: Workflow, closable: true },
    { pattern: '/settings', title: 'Configuración', icon: Settings, closable: true },
];

export interface ResolvedRoute {
    meta: RouteMeta;
    /** Parámetros ya decodificados (una sola vez). */
    params: Record<string, string>;
    /** Título a mostrar (para rutas con parámetro se deriva del recurso). */
    title: string;
}

/** Ruta de un tab que abre el workflow en `filePath`. */
export function flowTabPath(filePath: string): string {
    return `/flows/${encodeURIComponent(filePath)}`;
}

function titleFromFile(filePath: string, fallback: string): string {
    const name = filePath.split(/[/\\]/).pop()?.replace(/\.(flux|json)$/i, '');
    return name || fallback;
}

/** Resuelve una ruta contra la tabla. `undefined` si no existe (p. ej. un tab obsoleto). */
export function resolveRoute(path: string): ResolvedRoute | undefined {
    for (const meta of routeMetas) {
        if (meta.pattern === path) return { meta, params: {}, title: meta.title };

        const paramIndex = meta.pattern.indexOf('/:');
        if (paramIndex === -1) continue;

        const prefix = meta.pattern.slice(0, paramIndex + 1); // "/flows/"
        const paramName = meta.pattern.slice(paramIndex + 2);
        if (!path.startsWith(prefix) || path.length === prefix.length) continue;

        let value: string;
        try {
            value = decodeURIComponent(path.slice(prefix.length));
        } catch {
            continue;
        }
        const title = paramName === 'pathId' ? titleFromFile(value, meta.title) : meta.title;
        return { meta, params: { [paramName]: value }, title };
    }
    return undefined;
}

/** Siempre devuelve un icono renderizable. */
export function getTabIcon(path: string): LucideIcon {
    return resolveRoute(path)?.meta.icon ?? FALLBACK_ICON;
}
