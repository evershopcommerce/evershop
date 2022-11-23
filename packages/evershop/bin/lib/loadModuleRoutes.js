const path = require('path');
const { existsSync } = require('fs');
const { registerAdminRoute } = require('../../src/lib/router/registerAdminRoute');
const { registerFrontStoreRoute } = require('../../src/lib/router/registerFrontStoreRoute');
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

  if (existsSync(path.resolve(modulePath, 'pages', 'frontStore'))) {
    const frontStoreControllerRoutes = scanForRoutes(path.resolve(modulePath, 'pages', 'frontStore'), false, false);
    frontStoreControllerRoutes.forEach((route) => {
      registerFrontStoreRoute(
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

  if (existsSync(path.resolve(modulePath, 'api', 'frontStore'))) {
    const frontStoreApiRoutes = scanForRoutes(path.resolve(modulePath, 'api', 'frontStore'), false, true);
    frontStoreApiRoutes.forEach((route) => {
      registerFrontStoreRoute(
        route.id,
        route.method,
        route.path,
        route.isApi,
        route.folder
      );
    });
  }
}