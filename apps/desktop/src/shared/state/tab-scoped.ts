import { atom, useAtom, type PrimitiveAtom } from 'jotai';

import { useTabId } from './tab-context';
import { onTabClosed } from './tabs';

/**
 * Estado "por tab" con atoms: una familia de atoms indexada por `tabId` que se libera
 * sola cuando el tab se cierra (patrón `atomFamily` + `tabValue`, pero sin fugas).
 *
 *   const panels = tabScopedAtom({ settings: false, inspector: false });
 *   // en un componente dentro de un tab:
 *   const [open, setOpen] = panels.useTabAtom();
 */
export function tabScopedAtom<T>(initial: T) {
    const atoms = new Map<string, PrimitiveAtom<T>>();

    const family = (tabId: string): PrimitiveAtom<T> => {
        let a = atoms.get(tabId);
        if (!a) {
            a = atom(initial);
            atoms.set(tabId, a);
        }
        return a;
    };

    onTabClosed((tabId) => atoms.delete(tabId));

    return {
        family,
        /** Igual que `useAtom`, pero para el tab actual. */
        useTabAtom: () => useAtom(family(useTabId())),
    };
}
