import type { AppNode } from '../../core/use-flow-store';
import { getPluginDefinition } from '../../plugins/registry';
import { Input } from '@/ui/components/ui/input';
import { Button } from '@/ui/components/ui/button';
import { Separator } from '@/ui/components/ui/separator';
import { Switch } from '@/ui/components/ui/switch';
import { Label } from '@/ui/components/ui/label';
import { Badge } from '@/ui/components/ui/badge';
import { ScrollArea } from '@/ui/components/ui/scroll-area';
import { X, Settings2, Globe, MessageSquare, Puzzle, type LucideIcon } from 'lucide-react';
import { WhatsAppConfigFields } from '../../plugins/whatsapp/whatsapp-config-fields';
import { HttpConfigFields } from '../../plugins/http/http-config-fields';

const ICON_MAP: Record<string, LucideIcon> = {
    Globe,
    MessageSquare,
    Puzzle,
};

interface NodeConfigPanelProps {
    node?: AppNode;
    onClose: () => void;
    onUpdateConfig: (nodeId: string, config: Record<string, any>) => void;
    onUpdateLabel: (nodeId: string, label: string) => void;
    onUpdateName: (nodeId: string, name: string) => void;
}

export function NodeConfigPanel({ node, onClose, onUpdateConfig, onUpdateLabel, onUpdateName }: NodeConfigPanelProps) {
    if (!node) return null;

    const plugin = getPluginDefinition(node.type || '');
    const Icon = ICON_MAP[plugin?.icon || ''] || Settings2;

    return (
        <div className="absolute right-0 top-0 h-full w-[340px] border-l bg-card z-50 shadow-xl flex flex-col animate-in slide-in-from-right-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: plugin?.color }} />
                    <h3 className="text-sm font-semibold">{plugin?.label || node.type}</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1 overflow-y-auto">
                <div className="p-4 flex flex-col gap-4">
                    {/* Label */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Etiqueta visual</Label>
                        <Input
                            value={node.data.label || ''}
                            onChange={(e) => onUpdateLabel(node.id, e.target.value)}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <Label className="text-xs font-medium text-muted-foreground">ID del Nodo</Label>
                            <Badge variant="outline" className="text-[9px] font-mono font-normal">{'{{' + (node.data.name || node.id) + '.data}}'}</Badge>
                        </div>
                        <Input
                            value={node.data.name || ''}
                            onChange={(e) => onUpdateName(node.id, e.target.value)}
                            className="h-8 text-sm font-mono"
                            placeholder="ej: mi_nodo"
                        />
                        <p className="text-[10px] text-muted-foreground">Úsalo para interpolar variables en otros nodos.</p>
                    </div>

                    <Separator />

                    {/* Config fields dinámicos por tipo */}
                    <ConfigFields
                        key={node.id}
                        nodeType={node.type || ''}
                        config={node.data.config}
                        onChange={(config) => onUpdateConfig(node.id, config)}
                    />
                </div>
            </ScrollArea>

            {/* Footer info */}
            <div className="border-t px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="font-mono">{node.id.slice(0, 8)}</span>
                <Badge variant="outline" className="text-[10px]">{node.type}</Badge>
            </div>
        </div>
    );
}

// ──── Config Fields por Plugin ────

interface ConfigFieldsProps {
    nodeType: string;
    config: Record<string, any>;
    onChange: (config: Record<string, any>) => void;
}

function ConfigFields({ nodeType, config, onChange }: ConfigFieldsProps) {
    const update = (key: string, value: any) => onChange({ ...config, [key]: value });

    switch (nodeType) {
        case 'http':
            return <HttpConfigFields config={config} update={update} onChange={onChange} />;
        case 'whatsapp':
            return <WhatsAppConfigFields config={config} update={update} />;
        default:
            return (
                <div className="text-xs text-muted-foreground italic">
                    No hay configuración disponible para este tipo de nodo.
                </div>
            );
    }
}

// ──── Shared UI atoms ────

export function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
            {children}
        </div>
    );
}

export function SwitchField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between">
            <Label className="text-xs">{label}</Label>
            <Switch checked={checked} onCheckedChange={onChange} />
        </div>
    );
}
