import express from 'express';
import { error } from '../../lib/log/logger.js';
import { Handler } from '../../lib/middleware/Handler.js';
import { getModuleMiddlewares } from '../../lib/middleware/index.js';
import { loadModuleRoutes } from '../../lib/router/loadModuleRoutes.js';
import { getRoutes } from '../../lib/router/Router.js';
import { getTrustProxyHops } from '../../lib/util/getTrustProxyHops.js';
import { getEnabledExtensions } from '../extension/index.js';
import { addDefaultMiddlewareFuncs } from './addDefaultMiddlewareFuncs.js';
import { getCoreModules } from './loadModules.js';

export const createApp = () => {
  /** Create express app */
  const app = express();
  // Trust proxy — determines request.ip (and thus rate-limit bucketing). The
  // number of proxy hops to trust is read from TRUST_PROXY_HOPS (default 1 = a
  // single reverse proxy). See lib/util/getTrustProxyHops.ts.
  app.set('trust proxy', getTrustProxyHops());
  /* Loading modules and initilize routes, components and services */
  const modules = getCoreModules();

  // Load routes and middleware functions
  modules.forEach((module) => {
    try {
      // Load middleware functions
      getModuleMiddlewares(module.path);
      // Load routes
      loadModuleRoutes(module.path);
    } catch (e) {
      error(e);
      process.exit(0);
    }
  });

  /** Load extensions */
  const extensions = getEnabledExtensions();
  extensions.forEach((extension) => {
    try {
      // Load middleware functions
      getModuleMiddlewares(extension.path);
      // Load routes
      loadModuleRoutes(extension.path);
    } catch (e) {
      error(e);
      process.exit(0);
    }
  });

  // Adding default middlewares
  addDefaultMiddlewareFuncs(app);
  const routes = getRoutes();
  routes.forEach((route) => {
    // app.all(route.path, Handler.middleware());
    route.method.forEach((method) => {
      switch (method.toUpperCase()) {
        case 'GET':
          app.get(route.path, Handler.middleware());
          break;
        case 'POST':
          app.post(route.path, Handler.middleware());
          break;
        case 'PUT':
          app.put(route.path, Handler.middleware());
          break;
        case 'DELETE':
          app.delete(route.path, Handler.middleware());
          break;
        case 'PATCH':
          app.patch(route.path, Handler.middleware());
          break;
        default:
          app.get(route.path, Handler.middleware());
          break;
      }
    });
  });
  app.use(Handler.middleware());
  return app;
};
