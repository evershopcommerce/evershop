import { resolve } from 'path';
import { getEnabledExtensions } from '../../bin/extension/index.js';
import { getCoreModules } from '../../bin/lib/loadModules.js';
import { getRoutes } from '../router/Router.js';
import { getEnabledTheme } from '../util/getEnabledTheme.js';
import { getEnabledWidgets } from '../widget/widgetManager.js';
import { ComponentsMap, scanRouteComponents } from './scanForComponents.js';

export function getComponentsByRoute(route) {
  const modules = [...getCoreModules(), ...getEnabledExtensions()];
  const theme = getEnabledTheme();

  let components;
  if (theme) {
    components = Object.values(
      scanRouteComponents(route, modules, resolve(theme.path, 'dist'))
    );
  } else {
    components = Object.values(scanRouteComponents(route, modules));
  }
  const widgets = getEnabledWidgets();
  if (!route.isAdmin) {
    // Add widgets to components
    return components.concat((widgets || []).map((widget) => widget.component));
  } else {
    // Add widgets to components
    return components.concat(
      (widgets || []).map((widget) => widget.settingComponent)
    );
  }
}

interface AllRouteComponentsMap {
  [routeId: string]: ComponentsMap;
}

/**
 * Scan components for all routes
 * @returns A map of route IDs to their components
 */
export function getAllRouteComponents(isAdmin = false): AllRouteComponentsMap {
  const allComponents: AllRouteComponentsMap = {};
  const routes = getRoutes().filter(
    (route) => route.isApi === false && route.isAdmin === isAdmin
  );
  routes.forEach((route) => {
    allComponents[route.id] = getComponentsByRoute(route);
  });

  return allComponents;
}
