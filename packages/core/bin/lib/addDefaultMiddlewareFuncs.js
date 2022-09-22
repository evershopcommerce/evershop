const cookieParser = require('cookie-parser');
const webpack = require("webpack");
const middleware = require("webpack-dev-middleware");
const { createConfigClient } = require('../../src/lib/webpack/dev/createConfigClient');
const isDevelopmentMode = require('../../src/lib/util/isDevelopmentMode');
const { isBuildRequired } = require('../../src/lib/webpack/isBuildRequired');

module.exports = exports = {};

exports.addDefaultMiddlewareFuncs = function addDefaultMiddlewareFuncs(app, routes) {
  routes.forEach((r) => {
    const currentRouteMiddleware = (request, response, next) => {
      // eslint-disable-next-line no-underscore-dangle
      request.currentRoute = r;
      next();
    };
    r.method.forEach((method) => {
      switch (method.toUpperCase()) {
        case 'GET':
          app.get(r.path, currentRouteMiddleware);
          break;
        case 'POST':
          app.post(r.path, currentRouteMiddleware);
          break;
        case 'PUT':
          app.put(r.path, currentRouteMiddleware);
          break;
        case 'DELETE':
          app.delete(r.path, currentRouteMiddleware);
          break;
        default:
          app.get(r.path, currentRouteMiddleware);
          break;
      }
    });

    /** 405 Not Allowed handle */
    app.all(r.path, (request, response, next) => {
      // eslint-disable-next-line no-underscore-dangle
      if (request.currentRoute && !request.currentRoute.method.includes(request.method)) {
        response.status(405).send('Method Not Allowed');
      } else {
        next();
      }
    });

    // Cookie parser
    app.use(cookieParser());

    // TODO:Termporary comment this code, Because some API requires body raw data. Like Stripe
    // if (r.isApi) {
    //   app.all(r.path, bodyParser.json({ inflate: false }));
    //   app.all(r.path, bodyParser.urlencoded({ extended: true }));
    // }

    // eslint-disable-next-line no-underscore-dangle
    // eslint-disable-next-line no-param-reassign
    // eslint-disable-next-line no-underscore-dangle
    r.__BUILDREQUIRED__ = true;
  });

  if (isDevelopmentMode()) {
    const compilers = {};
    routes.forEach((route) => {
      if (isBuildRequired(route)) {
        compilers[route.id] = webpack(createConfigClient(route));
      } else {
        return
      }
    });

    function findRoute(request) {
      if (request.currentRoute) {
        return request.currentRoute
      } else {
        const path = request.originalUrl.split('?')[0];
        if (path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.json')) {
          const id = path.split('/').pop().split('.')[0];
          return routes.find((r) => r.id === id);
        } else if (path.includes('/eHot/')) {
          const id = path.split('/').pop();
          return routes.find((r) => r.id === id);
        } else {
          return routes.find((r) => r.id === 'notFound');
        }
      }
    }

    app.use(
      (request, response, next) => {
        const route = findRoute(request);
        request.locals = request.locals || {};
        request.locals.webpackMatchedRoute = route;
        if (!isBuildRequired(route)) {
          next();
        } else {
          const webpackCompiler = compilers[route.id];
          let middlewareFunc;
          if (!route.webpackMiddleware) {
            middlewareFunc = route.webpackMiddleware = middleware(webpackCompiler, {
              serverSideRender: true, publicPath: '/', stats: 'none'
            });
            middlewareFunc.context.logger.info = (message) => {
              return
            }
          } else {
            middlewareFunc = route.webpackMiddleware;
          }

          middlewareFunc(request, response, next);
        }
      }
    );

    routes.forEach((route) => {
      if (isBuildRequired(route)) {
        const webpackCompiler = compilers[route.id];
        const hotMiddleware = route.hotMiddleware ? route.hotMiddleware : require("webpack-hot-middleware")(webpackCompiler, { path: `/eHot/${route.id}` });
        if (!route.hotMiddleware) {
          route.hotMiddleware = hotMiddleware;
        }
        app.use(
          hotMiddleware
        );
      } else {
        return
      }
    });
  }

  /** 404 Not Found handle */
  app.use((request, response, next) => {
    if (!request.currentRoute) {
      response.status(404);
      request.currentRoute = routes.find((r) => r.id === 'notFound');
      next();
    } else {
      next();
    }
  });
}