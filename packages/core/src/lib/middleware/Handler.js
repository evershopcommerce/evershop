const isDevelopmentMode = require("../util/isDevelopmentMode");
const isErrorHandlerTriggered = require("./isErrorHandlerTriggered");
const { sortMiddlewares } = require("./sort");
const { existsSync } = require("fs");
const { parseFromFile } = require("./parseFromFile");
const { noDublicateId } = require("./noDuplicateId");
const { buildMiddlewareFunction } = require("./buildMiddlewareFunction");
const { getRoutes } = require("../router/Router");

class Handler {
  static middlewares = [];

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
    let middlewares = this.middlewares.filter((m) => m.routeId === route.id || m.scope === 'app');
    if (route.isAdmin === true) {
      middlewares = sortMiddlewares(middlewares.concat(this.middlewares.filter((m) => m.routeId === 'admin')));
    } else {
      middlewares = sortMiddlewares(middlewares.concat(this.middlewares.filter((m) => m.routeId === 'site')));
    }

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

    return middlewares;
  }

  static getAppLevelMiddlewares() {
    return sortMiddlewares(this.middlewares.filter((m) => m.scope === 'app'));
  }

  static removeMiddleware(path) {
    this.middlewares = this.middlewares.filter((m) => m.path !== path);
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
          console.error(`Duplicate middleware id: ${middleware.id}`);
        }
      }
      );
    }
  }

  static middleware() {
    return (request, response, next) => {
      const currentRoute = request.currentRoute;
      let middlewares;
      if (!currentRoute) {
        middlewares = this.getAppLevelMiddlewares();
      } else {
        middlewares = this.getMiddlewareByRoute(currentRoute);
      }

      const goodHandlers = middlewares.filter((m) => m.middleware.length === 3);
      const errorHandlers = middlewares.filter((m) => m.middleware.length === 4);

      let currentGood = 0;
      let currentError = -1;
      const eNext = function eNext() {
        if (arguments.length === 0 && currentGood === goodHandlers.length - 1) {
          next();
        } else if (currentError === errorHandlers.length - 1) {
          next(arguments[0]);
        } else {
          if (arguments.length > 0) {
            // Call the error handler middleware if it is not called yet
            if (!isErrorHandlerTriggered(response)) {
              currentError++;
              //console.log(errorHandlers[currentError]);
              const middlewareFunc = errorHandlers[currentError]['middleware'];
              middlewareFunc(arguments[0], request, response, eNext);
            }
          } else {
            currentGood++;
            //console.log(goodHandlers[currentGood]);
            const middlewareFunc = goodHandlers[currentGood]['middleware'];
            middlewareFunc(request, response, eNext);
          }
        }
      }
      // Run the middlewares
      const middleware = goodHandlers[0]['middleware'];
      middleware(request, response, eNext);
    }
  }
}

module.exports.Handler = Handler;