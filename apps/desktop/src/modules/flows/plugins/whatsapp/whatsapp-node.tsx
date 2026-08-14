import { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { AppNode } from '../../core/use-flow-store';
import { MessageSquare } from 'lucide-react';
import { BaseNode, BaseNodeHeader, BaseNodeHeaderTitle, BaseNodeContent } from '@/ui/components/react-flow/base-node';
import { NodeStatusIndicator, type NodeStatus } from '@/ui/components/react-flow/node-status-indicator';
import { BaseHandle } from '@/ui/components/react-flow/base-handle';
import { Badge } from '@/ui/components/ui/badge';

const ACTION_LABELS: Record<string, string> = {
  send_message: 'Enviar Mensaje',
  send_media: 'Enviar Media',
  get_chats: 'Obtener Chats',
  get_messages: 'Leer Mensajes',
  get_contacts: 'Contactos',
  get_group_info: 'Info Grupo',
  get_profile_picture: 'Foto Perfil',
};

export const WhatsAppNode = memo(({ data, selected }: NodeProps<AppNode>) => {
  const mapStatus = (status?: string): NodeStatus => {
    switch (status) {
      case 'running': return 'loading';
      case 'success': return 'success';
      case 'error': return 'error';
      default: return 'initial';
    }
  };

  const action = data.config?.action || 'send_message';

  return (
    <NodeStatusIndicator status={mapStatus(data.status)} variant="border">
      <BaseNode className="w-64" data-selected={selected}>
        <BaseNodeHeader>
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-green-500" />
            <BaseNodeHeaderTitle>{data.label || 'WhatsApp'}</BaseNodeHeaderTitle>
          </div>
        </BaseNodeHeader>
        
        <BaseNodeContent>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Acción</span>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {ACTION_LABELS[action] || action}
              </Badge>
            </div>

            {data.config?.phoneNumber && (
              <div className="text-muted-foreground truncate" title={data.config.phoneNumber}>
                📱 {data.config.phoneNumber}
              </div>
            )}

            {data.config?.message && (
              <div className="text-muted-foreground truncate text-[10px] italic opacity-75" title={data.config.message}>
                "{data.config.message}"
              </div>
            )}

            {data.status && (
              <div className="mt-2 pt-2 border-t">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Status</span>
                <div className="text-xs capitalize">{data.status}</div>
                {data.error && (
                  <div className="text-xs text-red-500 mt-1 p-1 bg-red-500/10 rounded">{data.error}</div>
                )}
                {data.result && (
                  <div className="text-[10px] text-green-500 mt-1 p-1 bg-green-500/10 rounded truncate">OK</div>
                )}
              </div>
            )}
          </div>
        </BaseNodeContent>

        <BaseHandle type="target" position={Position.Left} />
        <BaseHandle type="source" position={Position.Right} />
      </BaseNode>
    </NodeStatusIndicator>
  );
});

WhatsAppNode.displayName = 'WhatsAppNode';
