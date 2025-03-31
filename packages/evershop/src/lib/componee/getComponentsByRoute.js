import { resolve } from 'path';
import { getCoreModules } from '@evershop/evershop/bin/lib/loadModules.js';
import { getEnabledExtensions } from '@evershop/evershop/bin/extension/index.js';
import { scanRouteComponents } from './scanForComponents.js';
import { getConfig } from '../util/getConfig.js';
import { CONSTANTS } from '../helpers.js';
import { getEnabledWidgets } from '../util/getEnabledWidgets.js';

export function getComponentsByRoute(route) {
  const modules = [...getCoreModules(), ...getEnabledExtensions()];
  const theme = getConfig('system.theme');

  let components;
  if (theme) {
    components = Object.values(
      scanRouteComponents(route, modules, resolve(CONSTANTS.THEMEPATH, theme))
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
      (widgets || []).map((widget) => widget.setting_component)
    );
  }
}
