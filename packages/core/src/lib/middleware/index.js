const { resolve } = require('path');
const { existsSync, readdirSync } = require('fs');
const { scanForMiddlewareFunctions } = require('./scanForMiddlewareFunctions');
const { sortMiddlewares } = require('./sort');
const { stack } = require('./stack');
const { buildMiddlewareFunction } = require('./buildMiddlewareFunction');
const { noDublicateId } = require('./noDuplicateId');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

exports.getAdminMiddlewares = function getAdminMiddlewares(routeId) {
  return sortMiddlewares(stack.middlewares.filter((m) => m.routeId === 'admin' || m.routeId === routeId || m.routeId === null));
};

exports.getFrontMiddlewares = function getFrontMiddlewares(routeId) {
  return sortMiddlewares(stack.middlewares.filter((m) => m.routeId === 'site' || m.routeId === routeId || m.routeId === null));
};

function checkAndBuild(middleware, routeId, scope) {
  if (noDublicateId(stack.middlewares, middleware, scope)) {
    stack.middlewares.push(
      buildMiddlewareFunction(
        middleware.id,
        middleware.middleware,
        routeId,
        middleware.before || null,
        middleware.after || null,
        scope
      )
    );
  } else {
    throw new Error(`Middleware id "${middleware.id}" is duplicated`);
  }
}

function loadScopedMiddlewareFunctions(_path, scope) {
  const routes = readdirSync(_path, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  routes.forEach((route) => {
    const middlewares = scanForMiddlewareFunctions(resolve(_path, route));
    if (route === 'all') {
      middlewares.forEach((m) => {
        checkAndBuild(m, scope, scope);
      });
    } else {
      const split = route.split(/[+]+/);
      if (split.length === 1) {
        middlewares.forEach((m) => {
          checkAndBuild(m, route, scope);
        });
      } else {
        split.forEach((s) => {
          const r = (s.trim());
          if (r !== '') {
            middlewares.forEach((m) => {
              checkAndBuild(m, r, scope);
            });
          }
        });
      }
    }
  });
}

/**
 * This function scan and load all middleware function of a module base on module path
 *
 * @param   {string}  _path  The path of the module
 *
 */
exports.getModuleMiddlewares = function getModuleMiddlewares(_path) {
  if (existsSync(resolve(_path, 'controllers'))) {
    // Scan for the application level middleware
    scanForMiddlewareFunctions(resolve(_path, 'controllers')).forEach((m) => {
      checkAndBuild(m, null, 'app');
    });

    // Scan for the admin level middleware
    if (existsSync(resolve(_path, 'controllers', 'admin'))) {
      loadScopedMiddlewareFunctions(resolve(_path, 'controllers', 'admin'), 'admin');
    }

    // Scan for the site level middleware
    if (existsSync(resolve(_path, 'controllers', 'site'))) {
      loadScopedMiddlewareFunctions(resolve(_path, 'controllers', 'site'), 'site');
    }
  }
  if (existsSync(resolve(_path, 'apiControllers'))) {
    // Scan for the application level middleware
    scanForMiddlewareFunctions(resolve(_path, 'apiControllers')).forEach((m) => {
      checkAndBuild(m, null, 'app');
    });

    // Scan for the admin level middleware
    if (existsSync(resolve(_path, 'apiControllers', 'admin'))) {
      loadScopedMiddlewareFunctions(resolve(_path, 'apiControllers', 'admin'), 'admin');
    }

    // Scan for the site level middleware
    if (existsSync(resolve(_path, 'apiControllers', 'site'))) {
      loadScopedMiddlewareFunctions(resolve(_path, 'apiControllers', 'site'), 'site');
    }
  }
};

/**
 * This function return a list of sorted middleware functions (all)
 *
 * @return  {array}  List of sorted middleware functions
 */
exports.getAllSortedMiddlewares = function getAllSortedMiddlewares() {
  return sortMiddlewares(stack.middlewares);
};
