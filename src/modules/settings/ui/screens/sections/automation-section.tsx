"use client"

import { useState } from "react"
import type { AutomationDefaults, GlobalVariable } from "@/modules/settings/lib/settings-types"
import {
    Badge,
    Field,
    SectionCard,
    Select,
    SettingRow,
    Switch,
    TextInput,
} from "@/modules/settings/ui/components/controls"
import { Button } from "@/ui/components/ui/button"
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react"

export function AutomationSection({
    automation,
    vars,
    onChangeAutomation,
    onChangeVars,
}: {
    automation: AutomationDefaults
    vars: GlobalVariable[]
    onChangeAutomation: (patch: Partial<AutomationDefaults>) => void
    onChangeVars: (next: GlobalVariable[]) => void
}) {
    const [revealed, setRevealed] = useState<Record<number, boolean>>({})

    function updateVar(i: number, patch: Partial<GlobalVariable>) {
        onChangeVars(vars.map((v, idx) => (idx === i ? { ...v, ...patch } : v)))
    }

    return (
        <div className="space-y-5">
            <SectionCard
                title="Valores por defecto de nodos HTTP"
                description="Se aplican a nodos nuevos. Cada nodo puede sobrescribirlos."
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Timeout (ms)">
                        <TextInput
                            type="number"
                            value={automation.httpTimeoutMs}
                            onChange={(e) => onChangeAutomation({ httpTimeoutMs: Number(e.target.value) })}
                        />
                    </Field>
                    <Field label="Content-Type por defecto">
                        <Select
                            value={automation.defaultContentType}
                            onChange={(e) => onChangeAutomation({ defaultContentType: e.target.value })}
                        >
                            <option value="application/x-www-form-urlencoded">x-www-form-urlencoded</option>
                            <option value="application/json">application/json</option>
                            <option value="multipart/form-data">multipart/form-data</option>
                            <option value="text/plain">text/plain</option>
                        </Select>
                    </Field>
                    <Field label="Reintentos">
                        <TextInput
                            type="number"
                            min={0}
                            value={automation.httpRetryCount}
                            onChange={(e) => onChangeAutomation({ httpRetryCount: Number(e.target.value) })}
                        />
                    </Field>
                    <Field label="Espera entre reintentos (ms)">
                        <TextInput
                            type="number"
                            min={0}
                            value={automation.httpRetryDelayMs}
                            onChange={(e) => onChangeAutomation({ httpRetryDelayMs: Number(e.target.value) })}
                        />
                    </Field>
                    <Field label="Máx. de redirecciones">
                        <TextInput
                            type="number"
                            min={0}
                            value={automation.maxRedirects}
                            onChange={(e) => onChangeAutomation({ maxRedirects: Number(e.target.value) })}
                        />
                    </Field>
                </div>

                <div className="mt-4 divide-y divide-border border-t border-border">
                    <SettingRow title="Persistir cookies" description="Mantiene la sesión entre nodos (login → consulta).">
                        <Switch checked={automation.persistCookies} onCheckedChange={(v) => onChangeAutomation({ persistCookies: v })} />
                    </SettingRow>
                    <SettingRow title="Ignorar errores SSL" description="Útil para endpoints internos con certificados propios.">
                        <Switch checked={automation.ignoreSslErrors} onCheckedChange={(v) => onChangeAutomation({ ignoreSslErrors: v })} />
                    </SettingRow>
                    <SettingRow title="Seguir redirecciones" description="Sigue automáticamente las respuestas 3xx.">
                        <Switch checked={automation.followRedirects} onCheckedChange={(v) => onChangeAutomation({ followRedirects: v })} />
                    </SettingRow>
                </div>
            </SectionCard>

            <SectionCard
                title="Variables globales"
                description="Disponibles en cualquier nodo como {{global.clave}}."
                action={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onChangeVars([...vars, { key: "", value: "", secret: false }])}
                    >
                        <Plus className="size-3.5" />
                        Añadir
                    </Button>
                }
            >
                <div className="space-y-2">
                    {vars.map((v, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className="w-40 shrink-0">
                                <TextInput
                                    className="font-mono"
                                    placeholder="clave"
                                    value={v.key}
                                    onChange={(e) => updateVar(i, { key: e.target.value })}
                                />
                            </div>
                            <div className="relative flex-1">
                                <TextInput
                                    className="font-mono pr-9"
                                    type={v.secret && !revealed[i] ? "password" : "text"}
                                    placeholder="valor"
                                    value={v.value}
                                    onChange={(e) => updateVar(i, { value: e.target.value })}
                                />
                                {v.secret && (
                                    <button
                                        type="button"
                                        onClick={() => setRevealed((r) => ({ ...r, [i]: !r[i] }))}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        aria-label={revealed[i] ? "Ocultar" : "Mostrar"}
                                    >
                                        {revealed[i] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => updateVar(i, { secret: !v.secret })}
                                className="shrink-0"
                                aria-label="Marcar como secreto"
                            >
                                <Badge tone={v.secret ? "warning" : "neutral"}>{v.secret ? "Secreto" : "Texto"}</Badge>
                            </button>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Eliminar variable"
                                onClick={() => onChangeVars(vars.filter((_, idx) => idx !== i))}
                            >
                                <Trash2 className="size-3.5" />
                            </Button>
                        </div>
                    ))}
                    {vars.length === 0 && (
                        <p className="py-4 text-center text-xs text-muted-foreground">Sin variables definidas.</p>
                    )}
                </div>
            </SectionCard>
        </div>
    )
}
