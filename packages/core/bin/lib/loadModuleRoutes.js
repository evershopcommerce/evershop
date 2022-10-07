const path = require('path');
const { existsSync } = require('fs');
const { registerAdminRoute } = require('../../src/lib/router/registerAdminRoute');
const { registerSiteRoute } = require('../../src/lib/router/registerSiteRoute');
const { scanForRoutes } = require('../../src/lib/router/scanForRoutes');

module.exports = exports = {};

exports.loadModuleRoutes = function loadModuleRoutes(modulePath) {
  // Check for routes
  if (existsSync(path.resolve(modulePath, 'pages', 'admin'))) {
    const adminControllerRoutes = scanForRoutes(path.resolve(modulePath, 'pages', 'admin'), true, false);
    adminControllerRoutes.forEach((route) => {
      registerAdminRoute(
        route.id,
        route.method,
        route.path,
        route.isApi,
        route.folder
      );
    });
  }

  if (existsSync(path.resolve(modulePath, 'pages', 'site'))) {
    const siteControllerRoutes = scanForRoutes(path.resolve(modulePath, 'pages', 'site'), false, false);
    siteControllerRoutes.forEach((route) => {
      registerSiteRoute(
        route.id,
        route.method,
        route.path,
        route.isApi,
        route.folder
      );
    });
  }

  if (existsSync(path.resolve(modulePath, 'api', 'admin'))) {
    const adminApiRoutes = scanForRoutes(path.resolve(modulePath, 'api', 'admin'), true, true);
    adminApiRoutes.forEach((route) => {
      registerAdminRoute(
        route.id,
        route.method,
        route.path,
        route.isApi,
        route.folder
      );
    });
  }

  if (existsSync(path.resolve(modulePath, 'api', 'site'))) {
    const siteApiRoutes = scanForRoutes(path.resolve(modulePath, 'api', 'site'), false, true);
    siteApiRoutes.forEach((route) => {
      registerSiteRoute(
        route.id,
        route.method,
        route.path,
        route.isApi,
        route.folder
      );
    });
  }
}