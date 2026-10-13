/**
 * Mapa centralizado de nodeTypes para React Flow.
 * Aquí se registran todos los componentes visuales de los plugins.
 * flow-canvas.tsx importa este mapa en lugar de definirlo inline.
 */
import type { NodeTypes } from '@xyflow/react';
import { HttpNode } from './http/http-node';
import { WhatsAppNode } from './whatsapp/whatsapp-node';

export const nodeTypes: NodeTypes = {
  http: HttpNode,
  whatsapp: WhatsAppNode,
};
