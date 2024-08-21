const { resolve } = require('path');
const { getCoreModules } = require('@evershop/evershop/bin/lib/loadModules');
const { getEnabledExtensions } = require('../../../bin/extension');
const { scanRouteComponents } = require('./scanForComponents');
const { getConfig } = require('../util/getConfig');
const { CONSTANTS } = require('../helpers');
const { getEnabledWidgets } = require('../util/getEnabledWidgets');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

exports.getComponentsByRoute = function getComponentsByRoute(route) {
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
};
