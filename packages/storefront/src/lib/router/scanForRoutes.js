import { existsSync, readdirSync } from 'fs';
import { basename, dirname, join } from 'path';
import { jsonParse } from '../util/jsonParse.js';

function startWith(str, prefix) {
  return str.slice(0, prefix.length) === prefix;
}

function validateRoute(methods, path, routePath) {
  if (methods.length === 0) {
    throw new Error(
      `Method is required. Please check the route defined at ${routePath}`
    );
  }
  const check = methods.find(
    (m) =>
      ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(
        m
      ) === false
  );
  if (check !== undefined) {
    throw new Error(
      `Method ${check} is invalid. Please check the route defined at ${routePath}`
    );
  }
  if (startWith(path, '/') === false) {
    throw new Error(
      `Path ${path} must be started with '/'. Please check the route defined at ${routePath}`
    );
  }

  return true;
}

export function parseRoute(jsonPath, isAdmin = false, isApi = false) {
  const routeId = basename(dirname(jsonPath));
  if (/^[a-zA-Z]+$/.test(routeId) === false) {
    throw new Error(
      `Route folder ${routeId} is invalid. It must contains only characters.`
    );
  }
  const routeJson = jsonParse(jsonPath);
  const methods = routeJson?.methods.map((m) => m.toUpperCase()) || [];
  let routePath = routeJson?.path;
  if (validateRoute(methods, routePath, routePath) === true) {
    if (isApi === true) {
      routePath = `/api${routePath}`;
    }
    // Load the validation schema
    let payloadSchema;
    if (existsSync(join(dirname(jsonPath), 'payloadSchema.json'))) {
      payloadSchema = jsonParse(join(dirname(jsonPath), 'payloadSchema.json'));
    }

    return {
      id: routeId,
      name: routeJson?.name || routeId,
      method: methods,
      path: routePath,
      isAdmin,
      isApi,
      folder: dirname(jsonPath),
      payloadSchema,
      access: routeJson?.access || 'private'
    };
  } else {
    return null;
  }
}

/**
 * Scan for routes base on module path.
 */
export function scanForRoutes(path, isAdmin, isApi) {
  const scanedRoutes = readdirSync(path, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
  return scanedRoutes
    .map((r) => {
      if (/^[A-Za-z.]+$/.test(r) === true) {
        if (existsSync(join(path, r, 'route.json'))) {
          return (
            parseRoute(join(path, r, 'route.json'), isAdmin, isApi) || false
          );
        } else {
          return false;
        }
      } else {
        return false;
      }
    })
    .filter((e) => e !== false);
}
