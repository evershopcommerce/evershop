import { Application } from 'express';
import { warning } from '../../../../lib/log/logger.js';
import { addRoute, hasRoute } from '../../../../lib/router/Router.js';
import { parseRoute } from '../../../../lib/router/scanForRoutes.js';
import { Event } from '../watchHandler.js';

export function addAdminRoute(app: Application, event: Event) {
  try {
    const jsonPath = event.path.toString();
    const route = parseRoute(jsonPath, true, false);
    if (hasRoute(route?.id)) {
      warning(`Route ${route?.id} already exists. Skipping adding new route.`);
    } else {
      addRoute(route);
    }
  } catch (error) {
    warning(
      `Failed to add new route from ${event.path}: ${error.message}. Skipping.`
    );
  }
}
