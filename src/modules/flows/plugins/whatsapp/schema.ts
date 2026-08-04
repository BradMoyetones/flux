import { z } from 'zod';

export const whatsappNodeSchema = z.object({
  action: z.enum([
    'send_message',
    'send_media',
    'get_chats',
    'get_messages',
    'get_contacts',
    'get_group_info',
    'get_profile_picture',
  ]),

  // ──── Envío ────
  phoneNumber: z.string().optional(),
  message: z.string().optional(),
  mediaPath: z.string().optional(),
  mediaCaption: z.string().optional(),

  // ──── Lectura ────
  chatId: z.string().optional(),
  messageLimit: z.number().int().positive().optional().default(50),

  // ──── Grupo ────
  groupId: z.string().optional(),

  // ──── Filtros ────
  filterContact: z.string().optional(),
  filterFromDate: z.string().optional(),
  filterToDate: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validación condicional según la acción
  if (data.action === 'send_message') {
    if (!data.phoneNumber) ctx.addIssue({ code: 'custom', path: ['phoneNumber'], message: 'Requerido para enviar mensaje' });
    if (!data.message) ctx.addIssue({ code: 'custom', path: ['message'], message: 'Requerido para enviar mensaje' });
  }
  if (data.action === 'send_media') {
    if (!data.phoneNumber) ctx.addIssue({ code: 'custom', path: ['phoneNumber'], message: 'Requerido para enviar media' });
    if (!data.mediaPath) ctx.addIssue({ code: 'custom', path: ['mediaPath'], message: 'Requerido para enviar media' });
  }
  if (data.action === 'get_messages' && !data.chatId) {
    ctx.addIssue({ code: 'custom', path: ['chatId'], message: 'Requerido para leer mensajes' });
  }
  if (data.action === 'get_group_info' && !data.groupId) {
    ctx.addIssue({ code: 'custom', path: ['groupId'], message: 'Requerido para info del grupo' });
  }
  if (data.action === 'get_profile_picture' && !data.phoneNumber) {
    ctx.addIssue({ code: 'custom', path: ['phoneNumber'], message: 'Requerido para foto de perfil' });
  }
});

export type WhatsAppNodeConfig = z.infer<typeof whatsappNodeSchema>;

export const whatsappDefaultConfig: WhatsAppNodeConfig = {
  action: 'send_message',
  phoneNumber: '',
  message: '',
  messageLimit: 50,
};
