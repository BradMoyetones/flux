import { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { AppNode } from '../../core/use-flow-store';
import { Globe } from 'lucide-react';
import { BaseNode, BaseNodeHeader, BaseNodeHeaderTitle, BaseNodeContent } from '@/ui/components/react-flow/base-node';
import { NodeStatusIndicator, type NodeStatus } from '@/ui/components/react-flow/node-status-indicator';
import { BaseHandle } from '@/ui/components/react-flow/base-handle';

export const HttpNode = memo(({ data, selected }: NodeProps<AppNode>) => {
  const mapStatus = (status?: string): NodeStatus => {
    switch (status) {
      case 'running': return 'loading';
      case 'success': return 'success';
      case 'error': return 'error';
      default: return 'initial';
    }
  };

  return (
    <NodeStatusIndicator status={mapStatus(data.status)} variant="border">
      <BaseNode className="w-64" data-selected={selected}>
        <BaseNodeHeader>
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-blue-500" />
            <BaseNodeHeaderTitle>{data.label || 'HTTP Request'}</BaseNodeHeaderTitle>
          </div>
        </BaseNodeHeader>
        
        <BaseNodeContent>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Method</span>
              <span className="font-mono text-primary">{data.config?.method || 'GET'}</span>
            </div>
            <div className="text-muted-foreground truncate" title={data.config?.url}>
              {data.config?.url || 'No URL specified'}
            </div>

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

HttpNode.displayName = 'HttpNode';
