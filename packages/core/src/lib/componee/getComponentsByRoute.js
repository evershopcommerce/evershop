const path = require('path');
const { existsSync, readdirSync } = require('fs');
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
    const rootPath = route.isAdmin ? path.resolve(module.path, 'pages/admin') : path.resolve(module.path, 'pages/site');
    // Get all folders in the rootPath
    const pages = existsSync(rootPath) ? readdirSync(rootPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name) : [];

    pages.forEach((page) => {
      if (page === 'all' || page === route.id) {
        components = [...components, ...scanForComponents(path.resolve(rootPath, page))];
      }
      // Check if page include `+ page` or `page+` in the name
      if (page.includes('+') && page.includes(route.id)) {
        components = [...components, ...scanForComponents(path.resolve(rootPath, page))];
      }
    });
  });

  return components;
};
