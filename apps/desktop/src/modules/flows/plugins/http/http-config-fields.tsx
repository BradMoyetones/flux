import { Input } from '@flux/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@flux/ui';
import { Separator } from '@flux/ui';
import { Textarea } from '@flux/ui';
import { Label } from '@flux/ui';
import { KeyValueBuilder } from '../../ui/components/key-value-builder';
import { FieldGroup, SwitchField } from '../../ui/components/node-config-panel';

export function HttpConfigFields({ config, update, onChange: _onChange }: {
    config: Record<string, any>;
    update: (key: string, value: any) => void;
    onChange: (config: Record<string, any>) => void;
}) {
    const isFormUrlEncoded = config.contentType === 'application/x-www-form-urlencoded';
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(config.method);

    return (
        <div className="flex flex-col gap-3">
            <FieldGroup label="Basics">
                <div className="flex gap-2">
                    <div className="w-28">
                        <Select value={config.method || 'GET'} onValueChange={(v) => update('method', v)}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(m => (
                                    <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Input
                        value={config.url || ''}
                        onChange={(e) => update('url', e.target.value)}
                        placeholder="https://api.example.com/endpoint"
                        className="h-8 text-xs flex-1"
                    />
                </div>
            </FieldGroup>

            <FieldGroup label="Content-Type">
                <Select value={config.contentType || 'application/json'} onValueChange={(v) => update('contentType', v)}>
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {['application/json', 'application/x-www-form-urlencoded', 'text/plain', 'text/xml', 'multipart/form-data'].map(ct => (
                            <SelectItem key={ct} value={ct} className="text-xs">{ct}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FieldGroup>

            {/* Body: KeyValueBuilder para form-urlencoded, Textarea para el resto */}
            {hasBody && (
                isFormUrlEncoded ? (
                    <FieldGroup label="Body (Form URL-Encoded)">
                        <KeyValueBuilder
                            value={config.bodyParams || {}}
                            onChange={(v) => update('bodyParams', v)}
                            keyPlaceholder="Campo"
                            valuePlaceholder="Valor (soporta {{interpolación}})"
                        />
                    </FieldGroup>
                ) : (
                    <FieldGroup label="Body">
                        <Textarea
                            value={config.body || ''}
                            onChange={(e) => update('body', e.target.value)}
                            placeholder='{"key": "value"}'
                            className="text-xs font-mono min-h-[80px]"
                        />
                    </FieldGroup>
                )
            )}

            <Separator />

            {/* Headers con KeyValueBuilder */}
            <FieldGroup label="Headers">
                <KeyValueBuilder
                    value={config.headers || {}}
                    onChange={(v) => update('headers', v)}
                    keyPlaceholder="Header"
                    valuePlaceholder="Valor (soporta {{interpolación}})"
                />
            </FieldGroup>

            {/* Query Params con KeyValueBuilder */}
            <FieldGroup label="Query Params">
                <KeyValueBuilder
                    value={config.queryParams || {}}
                    onChange={(v) => update('queryParams', v)}
                    keyPlaceholder="Param"
                    valuePlaceholder="Value"
                />
            </FieldGroup>

            <Separator />

            {/* Raw Cookies */}
            <FieldGroup label="Cookies (Raw)">
                <Input
                    value={config.rawCookies || ''}
                    onChange={(e) => update('rawCookies', e.target.value)}
                    placeholder="PHPSESSID={{node1.data.cookies.PHPSESSID}}"
                    className="h-8 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                    Inyecta cookies de nodos previos con {'{{nodeId.data.cookies.nombre}}'}
                </p>
            </FieldGroup>

            <FieldGroup label="Response Type">
                <Select value={config.responseType || 'auto'} onValueChange={(v) => update('responseType', v)}>
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {['auto', 'json', 'text', 'binary'].map(rt => (
                            <SelectItem key={rt} value={rt} className="text-xs capitalize">{rt}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FieldGroup>

            <Separator />

            <FieldGroup label="Comportamiento">
                <div className="flex flex-col gap-2">
                    <SwitchField
                        label="Seguir Redirects"
                        checked={config.followRedirects !== false}
                        onChange={(v) => update('followRedirects', v)}
                    />
                    <SwitchField
                        label="Ignorar errores SSL"
                        checked={config.ignoreSslErrors === true}
                        onChange={(v) => update('ignoreSslErrors', v)}
                    />
                    <SwitchField
                        label="Persistir Cookies"
                        checked={config.persistCookies === true}
                        onChange={(v) => update('persistCookies', v)}
                    />
                </div>
            </FieldGroup>

            <FieldGroup label="Timeout (ms)">
                <Input
                    type="number"
                    value={config.timeoutMs || 30000}
                    onChange={(e) => update('timeoutMs', parseInt(e.target.value) || 30000)}
                    className="h-8 text-xs"
                />
            </FieldGroup>

            <FieldGroup label="Retry">
                <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Intentos</Label>
                        <Input
                            type="number"
                            value={config.retryCount || 0}
                            onChange={(e) => update('retryCount', parseInt(e.target.value) || 0)}
                            className="h-8 text-xs"
                            min={0}
                        />
                    </div>
                    <div className="flex-1 space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Delay (ms)</Label>
                        <Input
                            type="number"
                            value={config.retryDelayMs || 1000}
                            onChange={(e) => update('retryDelayMs', parseInt(e.target.value) || 1000)}
                            className="h-8 text-xs"
                            min={0}
                        />
                    </div>
                </div>
            </FieldGroup>
        </div>
    );
}
