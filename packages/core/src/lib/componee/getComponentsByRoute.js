const { normalize, resolve, join } = require('path');
const { existsSync, readdirSync } = require('fs');
const { getEnabledExtensions } = require('../../../bin/extension');
const { getCoreModules } = require('../../../bin/lib/loadModules');
const { scanForComponents } = require('./scanForComponents');
const { getConfig } = require('../util/getConfig');
const { CONSTANTS } = require('../helpers');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

exports.getComponentsByRoute = function getComponentsByRoute(route) {
  let components = [];
  const modules = [...getCoreModules(), ...getEnabledExtensions()];

  modules.forEach((module) => {
    // Scan for 'all' components
    const rootPath = route.isAdmin ? resolve(module.path, 'pages/admin') : resolve(module.path, 'pages/frontStore');
    // Get all folders in the rootPath
    const pages = existsSync(rootPath) ? readdirSync(rootPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name) : [];

    pages.forEach((page) => {
      if (page === 'all' || page === route.id) {
        components = [...components, ...scanForComponents(resolve(rootPath, page))];
      }
      // Check if page include `+ page` or `page+` in the name
      if (page.includes('+') && page.includes(route.id)) {
        components = [...components, ...scanForComponents(resolve(rootPath, page))];
      }
    });
  });

  if (route.isAdmin) {
    return components; // We currently don't have any admin theme
  } else {
    // Get current theme
    const theme = getConfig('shop.theme');
    if (!theme) {
      return components;
    }

    const themePath = resolve(CONSTANTS.THEMEPATH, theme);
    // Check if the path is exists
    if (existsSync(themePath)) {
      // Get all theme components inside 'theme/pages' folder
      let themeComponents = [];
      if (existsSync(resolve(themePath, 'pages', route.id))) {
        themeComponents = scanForComponents(resolve(themePath, 'pages', route.id));
      }
      return themeComponents.concat(components.map((component) => {
        // Get the subpath of `moduleName/pages/frontStore/{component.js}`;
        const splits = component.split(normalize('/pages/frontStore'));
        // Get the moduleName
        const moduleName = splits[0].split(normalize('/')).pop();
        const subPath = splits[1];
        const fullPath = join(themePath, moduleName, 'pages', subPath);
        if (existsSync(fullPath)) {
          return fullPath;
        } else {
          return component;
        }
      }));
    } else {
      return components;
    }
  }
};
