import { z } from 'zod';

export const httpNodeSchema = z.object({
  url: z.string().url("Debe ser una URL válida"),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional()
});

export type HttpNodeConfig = z.infer<typeof httpNodeSchema>;

// Configuración por defecto al arrastrar al canvas
export const httpNodeDefaultConfig: HttpNodeConfig = {
  url: 'https://',
  method: 'GET',
};
