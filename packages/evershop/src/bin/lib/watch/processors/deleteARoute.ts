import { basename, dirname } from 'path';
import { Application } from 'express';
import { warning } from '../../../../lib/log/logger.js';
import { deleteRoute, hasRoute } from '../../../../lib/router/Router.js';
import { Event } from '../watchHandler.js';

export function deleteARoute(app: Application, event: Event) {
  try {
    const jsonPath = event.path.toString();
    const routeId = jsonPath.includes('route.json')
      ? basename(dirname(jsonPath))
      : basename(jsonPath);
    if (hasRoute(routeId)) {
      deleteRoute(routeId);
    }
  } catch (error) {
    warning(
      `Failed to delete route from ${event.path}: ${error.message}. Skipping.`
    );
  }
}
