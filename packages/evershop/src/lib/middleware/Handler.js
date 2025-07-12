import { existsSync } from 'fs';
import path, { dirname } from 'path';
import { error } from '../log/logger.js';
import { getRoutes } from '../router/Router.js';
import isDevelopmentMode from '../util/isDevelopmentMode.js';
import isProductionMode from '../util/isProductionMode.js';
import isErrorHandlerTriggered from './isErrorHandlerTriggered.js';
import { noDublicateId } from './noDuplicateId.js';
import { parseFromFile } from './parseFromFile.js';
import { sortMiddlewares } from './sort.js';

export class Handler {
  constructor(routeId) {
    this.routeId = routeId;
  }

  static addMiddleware(middleware) {
    this.middlewares.push(middleware);
  }

  static getMiddlewares() {
    return this.middlewares;
  }

  static getMiddleware(id) {
    return this.middlewares.find((m) => m.id === id);
  }

  static getMiddlewareByRoute(route) {
    const routeId = route.id;
    if (isProductionMode() && this.sortedMiddlewarePerRoute[routeId]) {
      return this.sortedMiddlewarePerRoute[routeId];
    }
    const region = route.isApi ? 'api' : 'pages';
    let middlewares = this.middlewares.filter(
      (m) =>
        (m.routeId === route.id || m.scope === 'app') && m.region === region
    );
    if (route.isAdmin === true) {
      middlewares = middlewares.concat(
        this.middlewares.filter(
          (m) => m.routeId === 'admin' && m.region === region
        )
      );
    } else {
      middlewares = middlewares.concat(
        this.middlewares.filter(
          (m) => m.routeId === 'frontStore' && m.region === region
        )
      );
    }
    middlewares = sortMiddlewares(middlewares);
    if (isDevelopmentMode()) {
      middlewares.unshift({
        middleware: (request, response, next) => {
          if (!existsSync(route.folder)) {
            response.statusCode = 404;
            const routes = getRoutes();
            request.currentRoute = routes.find((r) => r.id === 'notFound');
          }
          next();
        }
      });
    }
    this.sortedMiddlewarePerRoute[routeId] = middlewares;
    return middlewares;
  }

  static getAppLevelMiddlewares(region) {
    return sortMiddlewares(
      this.middlewares.filter((m) => m.scope === 'app' && m.region === region)
    );
  }

  static removeMiddleware(path) {
    this.middlewares = this.middlewares.filter((m) => m.path !== path);
  }

  static removeMiddlewares(basePath) {
    this.middlewares = this.middlewares.filter((m) => {
      if (m.path === basePath) {
        return false;
      } else if (dirname(m.path) === basePath) {
        return false;
      } else {
        return true;
      }
    });
  }

  static addMiddlewareFromPath(path) {
    if (!existsSync(path) || !path.endsWith('.js')) {
      throw new Error(`Middleware file ${path} does not exist`);
    } else {
      const middlewares = parseFromFile(path);
      middlewares.forEach((middleware) => {
        if (noDublicateId(this.middlewares, middleware)) {
          this.addMiddleware(middleware);
        } else {
          error(`Duplicate middleware id: ${middleware.id}`);
        }
      });
    }
  }

  static middleware() {
    return (request, response, next) => {
      var _a;
      request.params = {
        ...(((_a = request.locals) === null || _a === void 0
          ? void 0
          : _a.customParams) || {}),
        ...request.params
      };
      const { currentRoute } = request;
      let middlewares;
      if (!currentRoute) {
        middlewares = this.getAppLevelMiddlewares('pages');
      } else {
        middlewares = this.getMiddlewareByRoute(currentRoute);
      }
      const goodHandlers = middlewares.filter((m) => m.middleware.length === 3);
      const errorHandlers = middlewares.filter(
        (m) => m.middleware.length === 4
      );
      let currentGood = 0;
      let currentError = -1;
      const eNext = function eNext() {
        if (arguments.length === 0 && currentGood === goodHandlers.length - 1) {
          next();
        } else if (currentError === errorHandlers.length - 1) {
          next(arguments[0]);
        } else if (arguments.length > 0) {
          // Call the error handler middleware if it is not called yet
          if (!isErrorHandlerTriggered(response)) {
            currentError += 1;
            const middlewareFunc = errorHandlers[currentError].middleware;
            middlewareFunc(arguments[0], request, response, eNext);
          }
        } else {
          currentGood += 1;
          const middlewareFunc = goodHandlers[currentGood].middleware;
          middlewareFunc(request, response, eNext);
        }
      };
      // Run the middlewares
      const { middleware } = goodHandlers[0];
      middleware(request, response, eNext);
    };
  }
}
Handler.middlewares = [];
Handler.sortedMiddlewarePerRoute = {};
