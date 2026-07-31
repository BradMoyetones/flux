import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { AppNodeData } from '../../core/use-flow-store';
import { Globe } from 'lucide-react';

export const HttpNode = memo(({ data }: NodeProps<AppNodeData>) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'running': return 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]';
      case 'success': return 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]';
      case 'error': return 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
      default: return 'border-border';
    }
  };

  return (
    <div className={`flex flex-col bg-card border-2 rounded-xl w-64 shadow-md transition-all duration-300 ${getStatusColor()}`}>
      {/* Header */}
      <div className="flex items-center gap-2 p-3 bg-muted/50 border-b rounded-t-xl">
        <div className="p-1.5 bg-blue-500/20 text-blue-500 rounded-md">
          <Globe size={16} />
        </div>
        <div className="font-semibold text-sm">{data.label || 'HTTP Request'}</div>
      </div>
      
      {/* Body */}
      <div className="p-3 flex flex-col gap-2">
        <div className="text-xs text-muted-foreground flex justify-between">
          <span>Method</span>
          <span className="font-mono text-primary">{data.config?.method || 'GET'}</span>
        </div>
        <div className="text-xs text-muted-foreground truncate" title={data.config?.url}>
          {data.config?.url || 'No URL specified'}
        </div>

        {/* Verbose/Debug Status */}
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

      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-muted-foreground" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />
    </div>
  );
});

HttpNode.displayName = 'HttpNode';
