import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flowTabPath } from '@/shared/router/route-meta';

// Los atoms leen localStorage al importarse (getOnInit), así que cada test importa el módulo limpio.
async function load() {
    vi.resetModules();
    return import('./tabs');
}

beforeEach(() => localStorage.clear());

describe('tabs (atoms)', () => {
    it('arranca solo con Home', async () => {
        const { tabActions } = await load();
        expect(tabActions.getTabs().map((t) => t.path)).toEqual(['/']);
        expect(tabActions.getActiveId()).toBe('home');
    });

    it('abre, reutiliza (focusExisting) y activa tabs', async () => {
        const { tabActions } = await load();
        const a = tabActions.open(flowTabPath('/ws/a.flux'))!;
        const b = tabActions.open(flowTabPath('/ws/b.flux'))!;
        expect(tabActions.getActiveId()).toBe(b);

        expect(tabActions.open(flowTabPath('/ws/a.flux'))).toBe(a); // reutiliza
        expect(tabActions.getActiveId()).toBe(a);
        expect(tabActions.getTabs()).toHaveLength(3);

        const dup = tabActions.open(flowTabPath('/ws/a.flux'), { focusExisting: false })!;
        expect(dup).not.toBe(a);
        expect(tabActions.getTabs()).toHaveLength(4);
    });

    it('ignora rutas inexistentes', async () => {
        const { tabActions } = await load();
        expect(tabActions.open('/no-existe')).toBeUndefined();
        expect(tabActions.getTabs()).toHaveLength(1);
    });

    it('cerrar el tab activo activa el vecino de la izquierda; Home no se cierra', async () => {
        const { tabActions } = await load();
        const a = tabActions.open(flowTabPath('/ws/a.flux'))!;
        const b = tabActions.open(flowTabPath('/ws/b.flux'))!;

        tabActions.close('home');
        expect(tabActions.getTabs().some((t) => t.id === 'home')).toBe(true);

        tabActions.close(b);
        expect(tabActions.getActiveId()).toBe(a);
        tabActions.close(a);
        expect(tabActions.getActiveId()).toBe('home');
    });

    it('notifica al cerrar para liberar el estado por tab', async () => {
        const { tabActions, onTabClosed } = await load();
        const closed: string[] = [];
        onTabClosed((id) => closed.push(id));
        const a = tabActions.open(flowTabPath('/ws/a.flux'))!;
        tabActions.close(a);
        expect(closed).toEqual([a]);
    });

    it('actualiza la ruta de un tab (renombrado)', async () => {
        const { tabActions } = await load();
        const a = tabActions.open(flowTabPath('/ws/a.flux'))!;
        tabActions.updatePath(a, flowTabPath('/ws/renamed.flux'));
        expect(tabActions.getTabs().find((t) => t.id === a)?.path).toBe(flowTabPath('/ws/renamed.flux'));
    });

    it('la sesión sobrevive a un reinicio', async () => {
        const first = await load();
        const a = first.tabActions.open(flowTabPath('/ws/a.flux'))!;
        first.tabActions.open('/settings');
        first.tabActions.activate(a);

        const second = await load(); // "reinicio"
        expect(second.tabActions.getTabs().map((t) => t.path)).toEqual(['/', flowTabPath('/ws/a.flux'), '/settings']);
        expect(second.tabActions.getActiveId()).toBe(a);
    });

    it('una sesión corrupta o con rutas obsoletas nunca rompe el arranque', async () => {
        localStorage.setItem('flux.tabs.v1', '{not json');
        expect((await load()).tabActions.getTabs().map((t) => t.path)).toEqual(['/']);

        localStorage.setItem(
            'flux.tabs.v1',
            JSON.stringify([
                { id: 'x', path: '/ruta-vieja' },
                { id: 's', path: '/settings' },
                { id: 's', path: '/settings' }, // id repetido
            ]),
        );
        localStorage.setItem('flux.activeTab.v1', JSON.stringify('x')); // huérfano
        const { tabActions } = await load();
        expect(tabActions.getTabs().map((t) => t.path)).toEqual(['/', '/settings']); // Home se repone
        expect(tabActions.getActiveId()).toBe('home');
    });
});
