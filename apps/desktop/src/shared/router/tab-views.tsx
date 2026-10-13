import { type ComponentType } from 'react';
import { ReactFlowProvider } from '@xyflow/react';

import { HomeView } from '@/modules/home/ui/screens/home-view';
import { ReleaseNotes } from '@/modules/release-notes/ui/screens/release-notes';
import FlowCanvas from '@/modules/flows/ui/screens/flow-canvas';
import SettingsView from '@/modules/settings/ui/screens';
import { FLOW_ROUTE_PATTERN, HOME_PATH } from './route-meta';

const FlowView = () => (
    <ReactFlowProvider>
        <FlowCanvas />
    </ReactFlowProvider>
);

/**
 * Vista (componente) de cada ruta. Va separado de `route-meta.ts` (solo datos) para
 * que el estado de los tabs no dependa de las pantallas.
 *
 * Para añadir una pantalla: 1) entrada en `routeMetas` y 2) su componente aquí.
 */
export const tabViews: Record<string, ComponentType> = {
    [HOME_PATH]: HomeView,
    '/release-notes': ReleaseNotes,
    [FLOW_ROUTE_PATTERN]: FlowView,
    '/settings': SettingsView,
};
