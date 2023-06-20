/* eslint-disable global-require */
const { readdirSync, existsSync } = require('fs');
const { join } = require('path');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

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

/**
 * Scan for routes base on module path.
 */

exports.scanForRoutes = (path, isAdmin, isApi) => {
  const scanedRoutes = readdirSync(path, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
  return scanedRoutes
    .map((r) => {
      if (/^[A-Za-z.]+$/.test(r) === true) {
        if (existsSync(join(path, r, 'route.json'))) {
          // import route.json
          const routeJson = require(join(path, r, 'route.json'));
          const methods = routeJson?.methods.map((m) => m.toUpperCase()) || [];
          let routePath = routeJson?.path;
          if (
            validateRoute(methods, routePath, join(path, r, 'route')) === true
          ) {
            if (isApi === true) {
              routePath = `/api${routePath}`;
            }
            // Load the validation schema
            let payloadSchema;
            if (existsSync(join(path, r, 'payloadSchema.json'))) {
              payloadSchema = require(join(path, r, 'payloadSchema.json'));
            }

            return {
              id: r,
              method: methods,
              path: routePath,
              isAdmin,
              isApi,
              folder: join(path, r),
              payloadSchema,
              access: routeJson?.access || 'private'
            };
          } else {
            return false;
          }
        } else {
          return false;
        }
      } else {
        return false;
      }
    })
    .filter((e) => e !== false);
};
