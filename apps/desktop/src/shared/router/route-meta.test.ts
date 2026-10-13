import { describe, expect, it } from 'vitest';
import { flowTabPath, resolveRoute, HOME_PATH, FLOW_ROUTE_PATTERN } from './route-meta';

describe('resolveRoute', () => {
    it('resuelve rutas exactas', () => {
        expect(resolveRoute(HOME_PATH)?.meta.closable).toBe(false);
        expect(resolveRoute('/settings')?.title).toBe('Configuración');
    });

    it('devuelve undefined para rutas desconocidas', () => {
        expect(resolveRoute('/nope')).toBeUndefined();
        expect(resolveRoute('/flows/')).toBeUndefined();
    });

    it('decodifica el parámetro una sola vez y deriva el título del archivo', () => {
        const file = '/Users/brad/Mis flujos/100% ventas.flux';
        const route = resolveRoute(flowTabPath(file));
        expect(route?.meta.pattern).toBe(FLOW_ROUTE_PATTERN);
        expect(route?.params.pathId).toBe(file);
        expect(route?.title).toBe('100% ventas');
    });

    it('soporta rutas de Windows', () => {
        const file = 'C:\\Users\\brad\\flows\\ventas.flux';
        expect(resolveRoute(flowTabPath(file))?.params.pathId).toBe(file);
        expect(resolveRoute(flowTabPath(file))?.title).toBe('ventas');
    });
});
