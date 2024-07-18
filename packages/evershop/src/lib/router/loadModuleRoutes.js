const path = require('path');
const { existsSync } = require('fs');
const { registerAdminRoute } = require('./registerAdminRoute');
const { registerFrontStoreRoute } = require('./registerFrontStoreRoute');
const { scanForRoutes } = require('./scanForRoutes');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

exports.loadModuleRoutes = function loadModuleRoutes(modulePath) {
  // Check for routes
  if (existsSync(path.resolve(modulePath, 'pages', 'admin'))) {
    const adminControllerRoutes = scanForRoutes(
      path.resolve(modulePath, 'pages', 'admin'),
      true,
      false
    );
    adminControllerRoutes.forEach((route) => {
      registerAdminRoute(
        route.id,
        route.method,
        route.path,
        route.name,
        route.isApi,
        route.folder
      );
    });
  }

  if (existsSync(path.resolve(modulePath, 'pages', 'frontStore'))) {
    const frontStoreControllerRoutes = scanForRoutes(
      path.resolve(modulePath, 'pages', 'frontStore'),
      false,
      false
    );
    frontStoreControllerRoutes.forEach((route) => {
      registerFrontStoreRoute(
        route.id,
        route.method,
        route.path,
        route.name,
        route.isApi,
        route.folder
      );
    });
  }

  // Wiwth API, we do not have admin and frontStore folders
  if (existsSync(path.resolve(modulePath, 'api'))) {
    const routes = scanForRoutes(path.resolve(modulePath, 'api'), false, true);
    routes.forEach((route) => {
      registerFrontStoreRoute(
        route.id,
        route.method,
        route.path,
        route.name,
        route.isApi,
        route.folder,
        route.payloadSchema,
        route.access
      );
    });
  }
};
