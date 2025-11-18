import { dirname, join } from 'path';
import { Application } from 'express';
import { warning } from '../../../../lib/log/logger.js';
import { addRoute } from '../../../../lib/router/Router.js';
import { parseRoute } from '../../../../lib/router/scanForRoutes.js';
import { Event } from '../watchHandler.js';

export function updateAdminRoute(app: Application, event: Event) {
  try {
    const jsonPath = event.path.toString();
    const route = parseRoute(
      join(dirname(jsonPath), 'route.json'),
      true,
      false
    );
    addRoute(route);
  } catch (error) {
    warning(`Failed to update route from ${event.path}: ${error.message}`);
  }
}
