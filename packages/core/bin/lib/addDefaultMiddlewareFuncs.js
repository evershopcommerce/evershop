const bodyParser = require('body-parser');
const { resolve } = require('path');
const webpack = require("webpack");
const middleware = require("webpack-dev-middleware");
const { createConfigClient } = require('../../src/lib/webpack/createConfigClient');
const chokidar = require('chokidar');
const { CONSTANTS } = require('../../src/lib/helpers');
const isDevelopmentMode = require('../../src/lib/util/isDevelopmentMode');

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

    // Body parser for API routes
    if (r.isApi) {
      app.all(r.path, bodyParser.json({ inflate: false }));
      app.all(r.path, bodyParser.urlencoded({ extended: true }));
    }

    // eslint-disable-next-line no-underscore-dangle
    // eslint-disable-next-line no-param-reassign
    // eslint-disable-next-line no-underscore-dangle
    r.__BUILDREQUIRED__ = true;
  });

  if (isDevelopmentMode()) {
    const compilers = [];
    routes.forEach((route) => {
      if (!route.isApi && !['staticAsset', 'adminStaticAsset'].includes(route.id)) {
        compilers.push(createConfigClient(route));
      } else {
        return
      }
    });
    const webpackCompiler = webpack(compilers);
    const middlewareFunc = middleware(webpackCompiler, {
      serverSideRender: true, publicPath: '/', stats: 'none'
    });

    app.use(
      (request, response, next) => {
        middlewareFunc(request, response, next);
      }
    );

    const hotMiddleware = require("webpack-hot-middleware")(webpackCompiler);
    app.use(
      hotMiddleware
    );

    /** Watch for changes in the server code */
    app.locals = app.locals || {};
    app.locals.FSWatcher = chokidar.watch('.', {
      ignored: /node_modules[\\/]/,
      ignoreInitial: true,
      persistent: true
    }).on('all', (event, path) => {
      if (path.includes('controllers')) {
        console.log('Reloading middleware');
        console.log(resolve(CONSTANTS.ROOTPATH, path))
        delete require.cache[require.resolve(resolve(CONSTANTS.ROOTPATH, path))];
        hotMiddleware.publish({
          name: 'test',
          action: 'serverReloaded'
        });
      }
      // server.removeListener('request', currentApp);
      // server.on('request', newApp);
      // currentApp = newApp;
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