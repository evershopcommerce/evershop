const path = require('path');
const { existsSync } = require('fs');
const { registerAdminRoute } = require('../../src/lib/router/registerAdminRoute');
const { registerSiteRoute } = require('../../src/lib/router/registerSiteRoute');
const { scanForRoutes } = require('../../src/lib/router/scanForRoutes');

module.exports = exports = {};

exports.loadModuleRoutes = function loadModuleRoutes(modulePath) {
  // Check for routes
  if (existsSync(path.resolve(modulePath, 'controllers', 'admin'))) {
    const adminControllerRoutes = scanForRoutes(path.resolve(modulePath, 'controllers', 'admin'), true, false);
    adminControllerRoutes.forEach((route) => {
      registerAdminRoute(
        route.id,
        route.method,
        route.path,
        route.isApi
      );
    });
  }

  if (existsSync(path.resolve(modulePath, 'controllers', 'site'))) {
    const siteControllerRoutes = scanForRoutes(path.resolve(modulePath, 'controllers', 'site'), false, false);
    siteControllerRoutes.forEach((route) => {
      registerSiteRoute(
        route.id,
        route.method,
        route.path,
        route.isApi
      );
    });
  }

  if (existsSync(path.resolve(modulePath, 'apiControllers', 'admin'))) {
    const adminApiRoutes = scanForRoutes(path.resolve(modulePath, 'apiControllers', 'admin'), true, true);
    adminApiRoutes.forEach((route) => {
      registerAdminRoute(
        route.id,
        route.method,
        route.path,
        route.isApi
      );
    });
  }

  if (existsSync(path.resolve(modulePath, 'apiControllers', 'site'))) {
    const siteApiRoutes = scanForRoutes(path.resolve(modulePath, 'apiControllers', 'site'), false, true);
    siteApiRoutes.forEach((route) => {
      registerSiteRoute(
        route.id,
        route.method,
        route.path,
        route.isApi
      );
    });
  }
}