import { Application } from 'express';
import { warning } from '../../../../lib/index.js';
import { addRoute, hasRoute } from '../../../../lib/router/Router.js';
import { parseRoute } from '../../../../lib/router/scanForRoutes.js';
import { Event } from '../watchHandler.js';

export function addApiRoute(app: Application, event: Event) {
  try {
    const jsonPath = event.path.toString();
    const route = parseRoute(jsonPath, false, true);
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
