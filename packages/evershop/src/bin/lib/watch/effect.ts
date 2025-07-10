import { existsSync } from 'fs';
import { basename, dirname } from 'path';
import { Application } from 'express';
import { minimatch } from 'minimatch';
import { has } from '../../../bin/dev/register.js';
import { getEnabledJobs } from '../../../lib/cronjob/jobManager.js';
import { debug, error } from '../../../lib/log/logger.js';
import { getRoute } from '../../../lib/router/Router.js';
import { broadcast } from './broadcast.js';
import { isRestartRequired } from './isRestartRequired.js';
import { isSrc } from './isSrc.js';
import { processors } from './processors/index.js';
import { Event } from './watchHandler.js';

export type Effect =
  | 'restart'
  | 'restart_cronjob'
  | 'restart_event'
  | 'add_middleware'
  | 'remove_middleware'
  | 'update_middleware'
  | 'add_component'
  | 'remove_component'
  | 'update_component'
  | 'add_api_route'
  | 'remove_api_route'
  | 'update_api_route'
  | 'add_admin_route'
  | 'remove_admin_route'
  | 'update_admin_route'
  | 'add_front_store_route'
  | 'remove_front_store_route'
  | 'update_front_store_route'
  | 'update_graphql'
  | 'unknown';

function isValidRouteFolder(name: string): boolean {
  const segments = name.split('+');
  // Make sure all segment match this regex: /^[a-zA-Z]+$/
  return segments.every((segment) => /^[a-zA-Z]+$/.test(segment));
}

export function detectEffect(event: Event): Effect {
  const jobs = getEnabledJobs();
  if (isRestartRequired(event)) {
    return 'restart'; // No specific effect, just a restart required
  } else if (minimatch(event.path.toString(), '**/+(api|admin|frontStore)/*')) {
    const fileName = basename(event.path.toString());
    if (!isValidRouteFolder(fileName)) {
      return 'unknown'; // Not a valid route folder, skip
    }
    if (event.type === 'delete') {
      const route = getRoute(fileName);
      if (route) {
        const routePath = route.path;
        if (!existsSync(routePath)) {
          // If the route file does not exist, it means the route folder is deleted. We can safely delete the route.
          if (route.isApi) {
            return 'remove_api_route';
          } else if (route.isAdmin) {
            return 'remove_admin_route';
          } else {
            return 'remove_front_store_route';
          }
        } else {
          return 'remove_middleware'; // The route folder still exists, so we just need to remove the middleware
        }
      } else {
        // This folder is not representing a route, so we just need to take care of midldleware functions
        return 'remove_middleware';
      }
    } else {
      return 'unknown';
    }
  } else if (
    minimatch(
      event.path.toString(),
      '**/+(api|admin|frontStore)/*/[a-z[]*.+(js|ts)'
    )
  ) {
    const routeFolder = basename(dirname(event.path.toString()));
    if (!isValidRouteFolder(routeFolder)) {
      return 'unknown'; // Not a valid route folder, skip
    }
    if (event.type === 'create') {
      return 'add_middleware'; // This is a middleware file
    } else if (event.type === 'delete') {
      return 'remove_middleware';
    } else {
      return 'update_middleware';
    }
  } else if (minimatch(event.path.toString(), '**/api/*/route.json')) {
    const routeFolder = basename(dirname(event.path.toString()));
    if (!isValidRouteFolder(routeFolder)) {
      return 'unknown'; // Not a valid route folder, skip
    }
    if (event.type === 'create') {
      return 'add_api_route';
    } else if (event.type === 'delete') {
      return 'remove_api_route';
    } else {
      return 'update_api_route';
    }
  } else if (minimatch(event.path.toString(), '**/api/*/payloadSchema.json')) {
    // This is a payload schema file for an API route
    const routeFolder = basename(dirname(event.path.toString()));
    if (!isValidRouteFolder(routeFolder)) {
      return 'unknown'; // Not a valid route folder, skip
    }
    return 'update_api_route';
  } else if (minimatch(event.path.toString(), '**/pages/admin/*/route.json')) {
    const routeFolder = basename(dirname(event.path.toString()));
    if (!isValidRouteFolder(routeFolder)) {
      return 'unknown'; // Not a valid route folder, skip
    }
    if (event.type === 'create') {
      return 'add_admin_route';
    } else if (event.type === 'delete') {
      return 'remove_admin_route';
    } else {
      return 'update_admin_route';
    }
  } else if (
    minimatch(event.path.toString(), '**/pages/frontStore/*/route.json')
  ) {
    const routeFolder = basename(dirname(event.path.toString()));
    if (!isValidRouteFolder(routeFolder)) {
      return 'unknown'; // Not a valid route folder, skip
    }
    if (event.type === 'create') {
      return 'add_front_store_route';
    } else if (event.type === 'delete') {
      return 'remove_front_store_route';
    } else {
      return 'update_front_store_route';
    }
  } else if (minimatch(event.path.toString(), '**/*/[A-Z]*.+(jsx|tsx)')) {
    const routeFolder = basename(dirname(event.path.toString()));
    if (!isValidRouteFolder(routeFolder)) {
      return 'unknown'; // Not a valid route folder, skip
    }
    if (event.type === 'create') {
      return 'add_component';
    } else if (event.type === 'delete') {
      return 'remove_component';
    } else {
      return 'update_component';
    }
  } else if (
    minimatch(event.path.toString(), '**/*/*.graphql') ||
    minimatch(event.path.toString(), '**/*/*.resolvers.+(ts|js)')
  ) {
    return 'update_graphql'; // GraphQL schema or resolvers file
  } else if (minimatch(event.path.toString(), '**/subscribers/**/*.+(ts|js)')) {
    return 'restart_event';
  }
  // Check if the file is a job file
  else if (
    event.path &&
    jobs.some(
      (job) =>
        job.resolve ===
        event.path.toString().replace('src', 'dist').replace(/\.ts$/, '.js')
    )
  ) {
    return 'restart_cronjob';
  } else if (isSrc(event.path.toString())) {
    const distPath = event.path
      .toString()
      .replace('src', 'dist')
      .replace(/\.ts$/, '.js');
    if (has(distPath)) {
      // This module is being used in the application, so we need to restart the process
      return 'restart';
    } else {
      return 'unknown'; // This is a source file, but not used in the application
    }
  } else {
    const distPath = event.path.toString();
    if (has(distPath)) {
      // This module is being used in the application, so we need to restart the process
      return 'restart';
    } else {
      return 'unknown'; // This is a source file, but not used in the application
    }
  }
}

export function applyEffects(events: Event[], app: Application) {
  for (const event of events) {
    if (!event.effect) {
      continue; // Skip if no effect is detected
    } else {
      const processor = processors[event.effect];
      if (processor) {
        try {
          debug(`Applying changes: ${event.effect} for ${event.path}`);
          processor(app, event);
        } catch (e) {
          error(`Error applying changes for ${event.path}:`);
          error(e);
        }
      } else {
        debug(`No processor found for effect type: ${event.effect}`);
      }
    }
  }
  // Call broadcast to notify all clients about the changes if there are any known effects
  if (
    events.some(
      (e) =>
        e.effect &&
        !['unknown', 'restart_cronjob', 'restart_event'].includes(e.effect) &&
        !e.effect.includes('component')
    )
  ) {
    debug('Broadcasting changes to all clients');
    broadcast();
  }
}
