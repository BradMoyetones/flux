import type { z } from 'zod';

import { httpNodeSchema, httpNodeDefaultConfig } from './http/schema';
import { whatsappNodeSchema, whatsappDefaultConfig } from './whatsapp/schema';

// ──── Plugin Definition ────
// Cada plugin registrado aquí dicta:
//   - schema: el esquema Zod que valida y genera formularios
//   - defaultConfig: la configuración inicial al arrastrar el nodo
//   - label: nombre legible para la UI
//   - icon: identificador del ícono (para resolver en la UI)
//   - category: agrupación en la sidebar de plugins
//   - color: color temático del nodo

export interface PluginDefinition<T = any> {
  type: string;
  label: string;
  description: string;
  icon: string;
  category: PluginCategory;
  color: string;
  schema: z.ZodType<T>;
  defaultConfig: T;
}

export type PluginCategory =
  | 'network'
  | 'messaging'
  | 'data'
  | 'logic'
  | 'integration'
  | 'utility';

export const PLUGIN_CATEGORIES: Record<PluginCategory, { label: string; icon: string }> = {
  network:     { label: 'Red y APIs',         icon: 'Globe' },
  messaging:   { label: 'Mensajería',         icon: 'MessageSquare' },
  data:        { label: 'Datos',              icon: 'Database' },
  logic:       { label: 'Lógica',             icon: 'GitBranch' },
  integration: { label: 'Integraciones',      icon: 'Puzzle' },
  utility:     { label: 'Utilidades',         icon: 'Wrench' },
};

// ──── Registry ────

export const pluginRegistry: Record<string, PluginDefinition> = {
  http: {
    type: 'http',
    label: 'HTTP Request',
    description: 'Cliente HTTP versátil con soporte para auth, proxy, redirects y retry.',
    icon: 'Globe',
    category: 'network',
    color: '#3b82f6', // blue-500
    schema: httpNodeSchema,
    defaultConfig: httpNodeDefaultConfig,
  },
  whatsapp: {
    type: 'whatsapp',
    label: 'WhatsApp',
    description: 'Envía mensajes, media y consulta chats vía WhatsApp.',
    icon: 'MessageSquare',
    category: 'messaging',
    color: '#22c55e', // green-500
    schema: whatsappNodeSchema,
    defaultConfig: whatsappDefaultConfig,
  },
};

// ──── Helpers ────

export function getPluginDefinition(type: string): PluginDefinition | undefined {
  return pluginRegistry[type];
}

export function getPluginsByCategory(): Map<PluginCategory, PluginDefinition[]> {
  const map = new Map<PluginCategory, PluginDefinition[]>();
  for (const plugin of Object.values(pluginRegistry)) {
    const existing = map.get(plugin.category) || [];
    existing.push(plugin);
    map.set(plugin.category, existing);
  }
  return map;
}

export function getAllPluginTypes(): string[] {
  return Object.keys(pluginRegistry);
}
