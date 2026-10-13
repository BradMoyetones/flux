/** Contrato de storage síncrono de `atomWithStorage` (jotai no exporta el tipo). */
export interface SyncStorage<T> {
    getItem: (key: string, initialValue: T) => T;
    setItem: (key: string, newValue: T) => void;
    removeItem: (key: string) => void;
}

/**
 * Storage síncrono para `atomWithStorage` que **valida lo que lee**.
 *
 * `parse` recibe el JSON ya parseado y devuelve el valor saneado, o `undefined` si es
 * inservible. Cualquier fallo (JSON corrupto, esquema viejo, storage no disponible)
 * cae al valor inicial: una sesión guardada defectuosa nunca debe romper el arranque.
 */
export function validatedStorage<T>(
    parse: (raw: unknown) => T | undefined,
    getStorage: () => Storage = () => localStorage,
): SyncStorage<T> {
    return {
        getItem(key, initialValue) {
            try {
                const raw = getStorage().getItem(key);
                if (raw === null) return initialValue;
                return parse(JSON.parse(raw)) ?? initialValue;
            } catch {
                return initialValue;
            }
        },
        setItem(key, value) {
            try {
                getStorage().setItem(key, JSON.stringify(value));
            } catch (error) {
                console.warn(`No se pudo persistir '${key}':`, error);
            }
        },
        removeItem(key) {
            try {
                getStorage().removeItem(key);
            } catch {
                /* noop */
            }
        },
    };
}
