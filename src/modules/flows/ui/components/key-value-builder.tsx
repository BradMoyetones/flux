import { useState, useCallback } from "react";
import { Input } from "@/ui/components/ui/input";
import { Button } from "@/ui/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface KVPair {
    id: string;
    key: string;
    value: string;
}

interface KeyValueBuilderProps {
    /** Pares clave-valor actuales como Record<string, string> */
    value: Record<string, string>;
    /** Callback cuando cambian los pares */
    onChange: (value: Record<string, string>) => void;
    /** Placeholder para la columna Key */
    keyPlaceholder?: string;
    /** Placeholder para la columna Value */
    valuePlaceholder?: string;
    /** Si true, deshabilita la edición */
    disabled?: boolean;
}

function recordToRows(record: Record<string, string>): KVPair[] {
    const entries = Object.entries(record);
    if (entries.length === 0) return [];
    return entries.map(([key, value]) => ({
        id: crypto.randomUUID(),
        key,
        value,
    }));
}

function rowsToRecord(rows: KVPair[]): Record<string, string> {
    const record: Record<string, string> = {};
    for (const row of rows) {
        if (row.key.trim()) {
            record[row.key.trim()] = row.value;
        }
    }
    return record;
}

export function KeyValueBuilder({
    value,
    onChange,
    keyPlaceholder = "Key",
    valuePlaceholder = "Value",
    disabled = false,
}: KeyValueBuilderProps) {
    const [rows, setRows] = useState<KVPair[]>(() => recordToRows(value));

    const emitChange = useCallback((updatedRows: KVPair[]) => {
        setRows(updatedRows);
        onChange(rowsToRecord(updatedRows));
    }, [onChange]);

    const addRow = () => {
        emitChange([...rows, { id: crypto.randomUUID(), key: "", value: "" }]);
    };

    const removeRow = (id: string) => {
        emitChange(rows.filter(r => r.id !== id));
    };

    const updateRow = (id: string, field: "key" | "value", val: string) => {
        emitChange(rows.map(r => r.id === id ? { ...r, [field]: val } : r));
    };

    return (
        <div className="flex flex-col gap-1.5">
            {rows.map((row) => (
                <div key={row.id} className="flex gap-1.5 items-center">
                    <Input
                        value={row.key}
                        onChange={(e) => updateRow(row.id, "key", e.target.value)}
                        placeholder={keyPlaceholder}
                        className="h-7 text-xs flex-1 font-mono"
                        disabled={disabled}
                    />
                    <Input
                        value={row.value}
                        onChange={(e) => updateRow(row.id, "value", e.target.value)}
                        placeholder={valuePlaceholder}
                        className="h-7 text-xs flex-[2] font-mono"
                        disabled={disabled}
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeRow(row.id)}
                        disabled={disabled}
                    >
                        <Trash2 className="w-3 h-3" />
                    </Button>
                </div>
            ))}
            <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs w-full mt-0.5"
                onClick={addRow}
                disabled={disabled}
            >
                <Plus className="w-3 h-3 mr-1" />
                Añadir
            </Button>
        </div>
    );
}
