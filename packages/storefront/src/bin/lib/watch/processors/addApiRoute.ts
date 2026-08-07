import { Application } from 'express';
import { warning } from '../../../../lib/log/logger.js';
import { Handler } from '../../../../lib/middleware/Handler.js';
import { addRoute, hasRoute } from '../../../../lib/router/Router.js';
import { parseRoute } from '../../../../lib/router/scanForRoutes.js';
import { Event } from '../watchHandler.js';

export function addApiRoute(app: Application, event: Event) {
  try {
    const jsonPath = event.path.toString();
    const route = parseRoute(jsonPath, false, true);
    if (!route || hasRoute(route?.id)) {
      warning(`Route ${route?.id} already exists. Skipping adding new route.`);
    } else {
      addRoute(route);
      for (const method of route.methods) {
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
      }
    }
  } catch (error) {
    warning(
      `Failed to add new route from ${event.path}: ${error.message}. Skipping.`
    );
  }
}
