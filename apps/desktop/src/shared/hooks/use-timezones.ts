import { useEffect, useState } from 'react';
import { api } from '@flux/api';

// La lista viene del backend (única fuente: chrono-tz) y no cambia en runtime.
let cache: Promise<string[]> | null = null;

export function loadTimezones(): Promise<string[]> {
    cache ??= api.config.listTimezones().catch((error) => {
        cache = null; // permitir reintento
        throw error;
    });
    return cache;
}

/** Zonas horarias IANA disponibles, expuestas por el backend. */
export function useTimezones(): string[] {
    const [timezones, setTimezones] = useState<string[]>([]);

    useEffect(() => {
        let cancelled = false;
        loadTimezones()
            .then((list) => !cancelled && setTimezones(list))
            .catch(console.error);
        return () => {
            cancelled = true;
        };
    }, []);

    return timezones;
}
