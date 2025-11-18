import { resolve } from 'path';
import { getEnabledExtensions } from '../../bin/extension/index.js';
import { getCoreModules } from '../../bin/lib/loadModules.js';
import { CONSTANTS } from '../helpers.js';
import { getEnabledTheme } from '../util/getEnabledTheme.js';
import { getEnabledWidgets } from '../widget/widgetManager.js';
import { scanRouteComponents } from './scanForComponents.js';

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
