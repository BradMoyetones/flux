import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flowTabPath } from '@/shared/router/route-meta';

const workflow = {
    id: 'wf-1',
    name: 'Ventas',
    description: '',
    trigger: { type: 'manual' },
    nodes: [{ id: 'n1', name: 'n1', type: 'http', label: 'HTTP', config: { url: 'https://a.test' }, position: { x: 10, y: 20 } }],
    edges: [],
    metadata: { total_executions: 0 },
};

const apiMock = vi.hoisted(() => ({
    getWorkflow: vi.fn(),
    saveWorkflow: vi.fn(),
    renameWorkflow: vi.fn(),
}));

vi.mock('@flux/api', () => ({
    api: {
        workflows: apiMock,
        execution: {},
        scheduler: {},
        events: { listen: vi.fn() },
    },
}));

const FILE = '/ws/ventas.flux';

async function setup() {
    vi.resetModules();
    const tabs = await import('@/shared/state/tabs');
    const flow = await import('./use-flow-store');
    const tabId = tabs.tabActions.open(flowTabPath(FILE))!;
    return { tabs, flow, tabId, store: flow.getFlowStore(tabId) };
}

beforeEach(() => {
    localStorage.clear();
    apiMock.getWorkflow.mockReset().mockImplementation(async () => structuredClone(workflow));
    apiMock.saveWorkflow.mockReset().mockResolvedValue(undefined);
    apiMock.renameWorkflow.mockReset();
    vi.useRealTimers();
});

describe('store de flujo por tab', () => {
    it('cada tab tiene su propio store (no hay singleton)', async () => {
        const { flow, tabs, tabId } = await setup();
        const other = tabs.tabActions.open(flowTabPath('/ws/otro.flux'))!;
        expect(flow.getFlowStore(tabId)).not.toBe(flow.getFlowStore(other));
        expect(flow.getFlowStore(tabId)).toBe(flow.getFlowStore(tabId));
    });

    it('la carga es idempotente: volver al tab no descarta cambios sin guardar', async () => {
        const { store, flow, tabId } = await setup();
        await store.getState().loadWorkflow(FILE);
        expect(apiMock.getWorkflow).toHaveBeenCalledTimes(1);
        expect(flow.isFlowTabDirty(tabId)).toBe(false);

        store.getState().setWorkflowName('Editado');
        expect(flow.isFlowTabDirty(tabId)).toBe(true);

        await store.getState().loadWorkflow(FILE); // "volver al tab"
        expect(apiMock.getWorkflow).toHaveBeenCalledTimes(1);
        expect(store.getState().workflowName).toBe('Editado');
    });

    it('guardar limpia el estado "sin guardar"', async () => {
        const { store, flow, tabId } = await setup();
        await store.getState().loadWorkflow(FILE);
        store.getState().setDescription('nueva descripción');
        expect(flow.isFlowTabDirty(tabId)).toBe(true);

        await store.getState().saveWorkflow(FILE);
        expect(apiMock.saveWorkflow).toHaveBeenCalledWith(FILE, expect.objectContaining({ id: 'wf-1', description: 'nueva descripción' }));
        expect(flow.isFlowTabDirty(tabId)).toBe(false);
    });

    it('arrastrar un nodo marca cambios; mover y volver al mismo sitio no', async () => {
        const { store, flow, tabId } = await setup();
        await store.getState().loadWorkflow(FILE);
        const node = store.getState().nodes[0];

        store.getState().setNodes([{ ...node, position: { x: 300, y: 300 } }]);
        expect(flow.isFlowTabDirty(tabId)).toBe(true);
        store.getState().setNodes([{ ...node, position: { x: 10, y: 20 } }]);
        expect(flow.isFlowTabDirty(tabId)).toBe(false);
    });

    it('los cambios sin guardar sobreviven a un reinicio (borrador) si el archivo no cambió', async () => {
        vi.useFakeTimers();
        const first = await setup();
        await first.store.getState().loadWorkflow(FILE);
        first.store.getState().setWorkflowName('Borrador');
        vi.advanceTimersByTime(1000); // debounce del borrador

        // "reinicio": módulos nuevos, mismo localStorage
        const second = await setup();
        await second.store.getState().loadWorkflow(FILE);
        expect(second.store.getState().workflowName).toBe('Borrador');
        expect(second.flow.isFlowTabDirty(second.tabId)).toBe(true);
    });

    it('un borrador de un archivo que cambió en disco se descarta', async () => {
        vi.useFakeTimers();
        const first = await setup();
        await first.store.getState().loadWorkflow(FILE);
        first.store.getState().setWorkflowName('Borrador');
        vi.advanceTimersByTime(1000);

        apiMock.getWorkflow.mockImplementation(async () => ({ ...structuredClone(workflow), name: 'Cambiado fuera de la app' }));
        const second = await setup();
        await second.store.getState().loadWorkflow(FILE);
        expect(second.store.getState().workflowName).toBe('Cambiado fuera de la app');
        expect(second.flow.isFlowTabDirty(second.tabId)).toBe(false);
    });

    it('cerrar el tab libera el store y descarta su borrador', async () => {
        vi.useFakeTimers();
        const { store, flow, tabs, tabId } = await setup();
        await store.getState().loadWorkflow(FILE);
        store.getState().setWorkflowName('Borrador');
        vi.advanceTimersByTime(1000);
        expect(localStorage.getItem(`flux.draft.v1:${FILE}`)).not.toBeNull();

        tabs.tabActions.close(tabId);
        expect(localStorage.getItem(`flux.draft.v1:${FILE}`)).toBeNull();
        expect(flow.getFlowStore(tabId)).not.toBe(store); // se creó uno nuevo → el anterior se liberó
    });

    it('un error de carga queda en el store (archivo borrado/fuera de workspace)', async () => {
        const { store } = await setup();
        apiMock.getWorkflow.mockRejectedValue({ code: 'STORAGE', message: 'El archivo no existe' });
        await store.getState().loadWorkflow(FILE);
        expect(store.getState().loadError).toBe('El archivo no existe');
        expect(store.getState().loaded).toBe(false);
    });
});
