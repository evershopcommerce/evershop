const { resolve } = require('path');
const { existsSync, readdirSync } = require('fs');
const { scanForMiddlewareFunctions } = require('./scanForMiddlewareFunctions');
const { sortMiddlewares } = require('./sort');
const { Handler } = require('./Handler');
const { addMiddleware } = require('./addMiddleware');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

let middlewareList = Handler.middlewares;

exports.getAdminMiddlewares = function getAdminMiddlewares(routeId) {
  return sortMiddlewares(middlewareList.filter((m) => m.routeId === 'admin' || m.routeId === routeId || m.routeId === null));
};

exports.getFrontMiddlewares = function getFrontMiddlewares(routeId) {
  return sortMiddlewares(middlewareList.filter((m) => m.routeId === 'site' || m.routeId === routeId || m.routeId === null));
};

/**
 * This function scan and load all middleware function of a module base on module path
 *
 * @param   {string}  path  The path of the module
 *
 */
exports.getModuleMiddlewares = function getModuleMiddlewares(path) {
  if (existsSync(resolve(path, 'controllers'))) {
    // Scan for the application level middleware
    scanForMiddlewareFunctions(resolve(path, 'controllers')).forEach((m) => {
      addMiddleware(m);
    });

    // Scan for the admin level middleware
    if (existsSync(resolve(path, 'controllers', 'admin'))) {
      const routes = readdirSync(resolve(path, 'controllers', 'admin'), { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
      routes.forEach((route) => {
        scanForMiddlewareFunctions(resolve(path, 'controllers', 'admin', route)).forEach((m) => {
          addMiddleware(m);
        });
      });
    }

    // Scan for the site level middleware
    if (existsSync(resolve(path, 'controllers', 'site'))) {
      const routes = readdirSync(resolve(path, 'controllers', 'site'), { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
      routes.forEach((route) => {
        scanForMiddlewareFunctions(resolve(path, 'controllers', 'site', route)).forEach((m) => {
          addMiddleware(m);
        });
      });
    }
  }
  if (existsSync(resolve(path, 'apiControllers'))) {
    // Scan for the application level middleware
    scanForMiddlewareFunctions(resolve(path, 'apiControllers')).forEach((m) => {
      addMiddleware(m);
    });

    // Scan for the admin level middleware
    if (existsSync(resolve(path, 'apiControllers', 'admin'))) {
      const routes = readdirSync(resolve(path, 'apiControllers', 'admin'), { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
      routes.forEach((route) => {
        scanForMiddlewareFunctions(resolve(path, 'apiControllers', 'admin', route)).forEach((m) => {
          addMiddleware(m);
        });
      });
    }

    // Scan for the site level middleware
    if (existsSync(resolve(path, 'apiControllers', 'site'))) {
      const routes = readdirSync(resolve(path, 'apiControllers', 'site'), { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
      routes.forEach((route) => {
        scanForMiddlewareFunctions(resolve(path, 'apiControllers', 'site', route)).forEach((m) => {
          addMiddleware(m);
        });
      });
    }
  }
};

/**
 * This function return a list of sorted middleware functions (all)
 *
 * @return  {array}  List of sorted middleware functions
 */
exports.getAllSortedMiddlewares = function getAllSortedMiddlewares() {
  return sortMiddlewares(middlewareList);
};
