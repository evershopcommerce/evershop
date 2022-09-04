const path = require('path');
const { existsSync } = require('fs');
const { getEnabledExtensions } = require('../../../bin/extension');
const { getCoreModules } = require('../../../bin/lib/loadModules');
const { scanForComponents } = require('./scanForComponents');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

exports.getComponentsByRoute = function getComponentsByRoute(route) {
  let components = [];
  const modules = [...getCoreModules(), ...getEnabledExtensions()];
  modules.forEach((module) => {
    // Scan for 'all' components
    const allPath = route.isAdmin ?
      path.resolve(module.path, 'pages/admin', 'all') :
      path.resolve(module.path, 'pages/site', 'all');
    if (existsSync(allPath)) {
      components = [...components, ...scanForComponents(allPath)];
    }

    // Scan for routed components
    const pagePath = route.isAdmin ?
      path.resolve(module.path, 'pages/admin', route.id) :
      path.resolve(module.path, 'pages/site', route.id);
    if (existsSync(pagePath)) {
      components = [...components, ...scanForComponents(pagePath)];
    }
  });

  return components;
};
