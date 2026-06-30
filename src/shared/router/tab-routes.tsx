import type { ComponentType } from 'react';
import { File, House, Sparkles, Workflow, type LucideIcon } from 'lucide-react';

import { FlowCanvas } from '@/modules/flows/ui/screens/flow-canvas';
import { HomeView } from '@/modules/home/ui/screens/home-view';
import { ReleaseNotes } from '@/modules/release-notes/ui/screens/release-notes';

/**
 * A `TabRoute` is OUR domain model. It is shaped *like* a react-router route
 * (`path` + a view component) but it also carries tab-only metadata that
 * react-router knows nothing about (`title`, `icon`, `closable`).
 *
 * Because of that extra metadata, `TabRoute[]` is NOT the same type as
 * react-router's `RouteObject[]`. Do not pass this array straight into
 * `createBrowserRouter` — TypeScript will (correctly) complain. Instead use the
 * `toRouteObjects()` adapter at the bottom of this file, which maps each
 * `TabRoute` to a real `RouteObject`. See the docblock there for details.
 */
export interface TabRoute {
    /** Router-style path. Used as the stable key for a tab. */
    path: string;
    /** Label shown on the tab. */
    title: string;
    /**
     * Icon rendered inside the tab + view header. OPTIONAL — when omitted we fall
     * back to {@link FALLBACK_ICON} via {@link getTabIcon}, so a route never
     * renders without an icon.
     */
    icon?: LucideIcon;
    /** Home is pinned and cannot be closed. */
    closable: boolean;
    /** The view component for this route. */
    element: ComponentType;
}

export const HOME_PATH = '/';

/** Used whenever a route has no `icon` of its own. */
export const FALLBACK_ICON: LucideIcon = File;

export const routes: TabRoute[] = [
    {
        path: HOME_PATH,
        title: 'Home',
        icon: House,
        closable: false,
        element: HomeView,
    },
    {
        path: '/release-notes/v1.2',
        title: 'Release Notes v1.2',
        icon: Sparkles,
        closable: true,
        element: ReleaseNotes,
    },
    {
        path: '/flows/sales',
        title: 'Flujo de Ventas',
        icon: Workflow,
        closable: true,
        element: FlowCanvas,
    },
    {
        path: '/flows/onboarding',
        // Intentionally has NO `icon` to demonstrate the fallback in action.
        title: 'Onboarding Automático',
        closable: true,
        element: FlowCanvas,
    },
];

const routeMap = new Map(routes.map((route) => [route.path, route]));

export function getRoute(path: string): TabRoute | undefined {
    return routeMap.get(path);
}

/**
 * Always returns a renderable icon for a route, applying {@link FALLBACK_ICON}
 * when the route (or path) has none. Use this in the UI instead of reading
 * `route.icon` directly so you never have to null-check an icon.
 */
export function getTabIcon(path: string): LucideIcon {
    return getRoute(path)?.icon ?? FALLBACK_ICON;
}

/* -------------------------------------------------------------------------- */
/*  react-router-dom adapter                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Converts our `TabRoute[]` into react-router `RouteObject[]`.
 *
 * Why this exists (and why you can't just pass `routes` directly):
 *
 *   1. `RouteObject` has no `title` / `icon` / `closable` fields. Passing those
 *      through would be a type error, so we strip them here.
 *   2. `RouteObject` does NOT take `element: ComponentType`. Its `element` field
 *      expects an already-created `ReactNode` (e.g. `<HomeView />`). The field
 *      that accepts a component *type* is `Component`. We map our
 *      `element: ComponentType` onto `Component`, which keeps things lazy and
 *      avoids instantiating JSX here.
 *
 * Usage once you install `react-router-dom`:
 *
 * ```ts
 * import { createBrowserRouter, RouterProvider } from 'react-router-dom'
 * import { toRouteObjects, type RouteObjectLike } from '@/shared/utils/tab-routes'
 *
 * const router = createBrowserRouter([
 *   {
 *     path: '/',
 *     Component: RootLayout, // renders <TabBar /> + <Outlet />
 *     children: toRouteObjects(),
 *   },
 * ])
 *
 * <RouterProvider router={router} />
 * ```
 *
 * The return type is annotated with the local `RouteObjectLike` shape so this
 * file stays dependency-free. When react-router is installed, swap the
 * annotation for the real `RouteObject` import and the structural types line up
 * 1:1 — no casting required.
 */
export interface RouteObjectLike {
    path?: string;
    index?: boolean;
    Component: ComponentType;
}

export function toRouteObjects(): RouteObjectLike[] {
    return routes.map((route) => {
        if (route.path === '/') {
            return { index: true, Component: route.element };
        }
        return {
            path: route.path.replace(/^\//, ''),
            Component: route.element,
        };
    });
}
