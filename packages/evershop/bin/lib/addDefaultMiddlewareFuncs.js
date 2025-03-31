/* eslint-disable no-param-reassign */
import cookieParser from 'cookie-parser';
import session from 'express-session';
import sessionStorage from 'connect-pg-simple';
import pathToRegexp from 'path-to-regexp';
import webpack from 'webpack';
import { debug } from '@evershop/evershop/src/lib/log/logger.js';
import middleware from 'webpack-dev-middleware';
import { createConfigClient } from '@evershop/evershop/src/lib/webpack/dev/createConfigClient.js';
import isDevelopmentMode from '@evershop/evershop/src/lib/util/isDevelopmentMode.js';
import { isBuildRequired } from '@evershop/evershop/src/lib/webpack/isBuildRequired.js';
import publicStatic from '@evershop/evershop/src/lib/middlewares/publicStatic.js';
import themePublicStatic from '@evershop/evershop/src/lib/middlewares/themePublicStatic.js';
import { select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/src/lib/postgres/connection.js';
import { setContextValue } from '@evershop/evershop/src/modules/graphql/services/contextHelper.js';
import { translate } from '@evershop/evershop/src/lib/locale/translate/translate.js';
import isProductionMode from '@evershop/evershop/src/lib/util/isProductionMode.js';
import { getConfig } from '@evershop/evershop/src/lib/util/getConfig.js';
import { getAdminSessionCookieName } from '@evershop/evershop/src/modules/auth/services/getAdminSessionCookieName.js';
import { getFrontStoreSessionCookieName } from '@evershop/evershop/src/modules/auth/services/getFrontStoreSessionCookieName.js';
import { getCookieSecret } from '@evershop/evershop/src/modules/auth/services/getCookieSecret.js';

export function addDefaultMiddlewareFuncs(app, routes) {
  app.use((request, response, next) => {
    response.debugMiddlewares = [];
    next();
    response.on('finish', () => {
      // Console log the debug middlewares
      let message = `[${request.method}] ${request.originalUrl}\n`;
      response.debugMiddlewares.forEach((m) => {
        message += m.time
          ? `-> Middleware ${m.id} - ${m.time} ms\n`
          : `-> Middleware ${m.id}\n`;
      });
      // Skip logging if the request is for static files
      if (
        request.currentRoute?.id === 'staticAsset' ||
        request.currentRoute?.id === 'adminStaticAsset'
      ) {
        return;
      }
      debug(message);
    });
  });
  // Add public static middleware
  app.use(publicStatic);
  // Add theme public static middleware
  app.use(themePublicStatic);

  // Express session
  const cookieSecret = getCookieSecret();
  const sess = {
    store:
      process.env.NODE_ENV === 'test'
        ? undefined
        : new (sessionStorage(session))({
            pool
          }),
    secret: cookieSecret,
    cookie: {
      maxAge: getConfig('system.session.maxAge', 24 * 60 * 60 * 1000)
    },
    resave: getConfig('system.session.resave', false),
    saveUninitialized: getConfig('system.session.saveUninitialized', true)
  };

  if (isProductionMode()) {
    app.set('trust proxy', 1);
    sess.cookie.secure = false;
  }

  const adminSessionMiddleware = session({
    ...sess,
    name: getAdminSessionCookieName()
  });

  const frontStoreSessionMiddleware = session({
    ...sess,
    name: getFrontStoreSessionCookieName()
  });

  const sessionMiddleware = (request, response, next) => {
    const { currentRoute } = request;
    if (currentRoute?.isApi) {
      // We don't need session for api routes. Restful api should be stateless
      next();
    } else if (currentRoute?.isAdmin) {
      adminSessionMiddleware(request, response, next);
    } else {
      frontStoreSessionMiddleware(request, response, next);
    }
  };

  function findRoute(request) {
    if (request.currentRoute) {
      return request.currentRoute;
    } else {
      const path = request.originalUrl.split('?')[0];
      if (
        path.endsWith('.js') ||
        path.endsWith('.css') ||
        path.endsWith('.json')
      ) {
        const id = path.split('/').pop().split('.')[0];
        return (
          routes.find((r) => r.id === id) ||
          routes.find((r) => r.id === 'notFound')
        );
      } else if (path.includes('/eHot/')) {
        const id = path.split('/').pop();
        return routes.find((r) => r.id === id);
      } else {
        return routes.find((r) => r.id === 'notFound');
      }
    }
  }

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
        case 'PATCH':
          app.patch(r.path, currentRouteMiddleware);
          break;
        default:
          app.get(r.path, currentRouteMiddleware);
          break;
      }
    });

    /** 405 Not Allowed handle */
    app.all(r.path, (request, response, next) => {
      // eslint-disable-next-line no-underscore-dangle
      if (
        request.currentRoute &&
        !request.currentRoute.method.includes(request.method)
      ) {
        response.status(405).send('Method Not Allowed');
      } else {
        next();
      }
    });

    // Cookie parser
    app.use(cookieParser(cookieSecret));
    // eslint-disable-next-line no-underscore-dangle
    r.__BUILDREQUIRED__ = true;
  });

  app.use(sessionMiddleware);

  app.use(async (request, response, next) => {
    // Get the request path, remove '/' from both ends
    const path = request.originalUrl.split('?')[0].replace(/^\/|\/$/g, '');
    // If the current route is already set, or the path contains .hot-update.json, .hot-update.js skip this middleware
    if (request.currentRoute || path.includes('.hot-update')) {
      return next();
    }
    // Also skip if we are running in the test mode
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    // Find the matched rewrite rule base on the request path
    const rewriteRule = await select()
      .from('url_rewrite')
      .where('request_path', '=', `/${path}`)
      .load(pool);

    if (rewriteRule) {
      // Find the route
      const route = routes.find((r) => {
        const regexp = pathToRegexp(r.path);
        const match = regexp.exec(rewriteRule.target_path);
        if (match) {
          request.locals = request.locals || {};
          request.locals.customParams = {};
          const keys = [];
          pathToRegexp(r.path, keys);
          keys.forEach((key, index) => {
            request.locals.customParams[key.name] = match[index + 1];
          });
          return true;
        }
        return false;
      });
      // Get the current http method
      const method = request.method.toUpperCase();
      // Check if the route supports the current http method
      if (route && route.method.includes(method)) {
        request.currentRoute = route;
      }
      return next();
    } else {
      return next();
    }
  });

  if (isDevelopmentMode()) {
    routes.forEach((route) => {
      if (isBuildRequired(route)) {
        route.webpackCompiler = webpack(createConfigClient(route));
      }
    });

    app.use((request, response, next) => {
      const route = findRoute(request);
      request.locals = request.locals || {};
      request.locals.webpackMatchedRoute = route;
      if (!isBuildRequired(route)) {
        next();
      } else {
        const { webpackCompiler } = route;
        let middlewareFunc;
        if (!route.webpackMiddleware) {
          middlewareFunc = route.webpackMiddleware = middleware(
            webpackCompiler,
            {
              serverSideRender: true,
              publicPath: '/',
              stats: 'none'
            }
          );
          middlewareFunc.context.logger.info = () => {};
        } else {
          middlewareFunc = route.webpackMiddleware;
        }
        middlewareFunc.waitUntilValid(() => {
          const { stats } = middlewareFunc.context;
          const jsonWebpackStats = stats.toJson();
          response.locals.jsonWebpackStats = jsonWebpackStats;
        });
        // We need to run build for notFound route
        const notFoundRoute = routes.find((r) => r.id === 'notFound');
        const notFoundWebpackCompiler = notFoundRoute.webpackCompiler;
        let notFoundMiddlewareFunc;
        if (!notFoundRoute.webpackMiddleware) {
          notFoundMiddlewareFunc = notFoundRoute.webpackMiddleware = middleware(
            notFoundWebpackCompiler,
            {
              serverSideRender: true,
              publicPath: '/',
              stats: 'none'
            }
          );
          notFoundMiddlewareFunc.context.logger.info = () => {};
        } else {
          notFoundMiddlewareFunc = notFoundRoute.webpackMiddleware;
        }

        // We need to run build for adminNotFound route
        const adminNotFoundRoute = routes.find((r) => r.id === 'adminNotFound');
        const adminNotFoundWebpackCompiler = adminNotFoundRoute.webpackCompiler;
        let adminNotFoundMiddlewareFunc;
        if (!adminNotFoundRoute.webpackMiddleware) {
          adminNotFoundMiddlewareFunc = adminNotFoundRoute.webpackMiddleware =
            middleware(adminNotFoundWebpackCompiler, {
              serverSideRender: true,
              publicPath: '/',
              stats: 'none'
            });
          adminNotFoundMiddlewareFunc.context.logger.info = () => {};
        } else {
          adminNotFoundMiddlewareFunc = adminNotFoundRoute.webpackMiddleware;
        }

        middlewareFunc(request, response, () => {
          notFoundMiddlewareFunc(request, response, () => {
            adminNotFoundMiddlewareFunc(request, response, next);
          });
        });
      }
    });

    routes.forEach((route) => {
      if (isBuildRequired(route)) {
        const { webpackCompiler } = route;
        const hotMiddleware = route.hotMiddleware
          ? route.hotMiddleware
          : require('webpack-hot-middleware')(webpackCompiler, {
              path: `/eHot/${route.id}`
            });
        if (!route.hotMiddleware) {
          route.hotMiddleware = hotMiddleware;
        }
        app.use(hotMiddleware);
      }
    });
  }

  /** 404 Not Found handle */
  app.use((request, response, next) => {
    if (!request.currentRoute) {
      response.status(404);
      request.currentRoute = routes.find((r) => r.id === 'notFound');
      setContextValue(request, 'pageInfo', {
        title: translate('Not found'),
        description: translate('Not found')
      });
      next();
    } else {
      next();
    }
  });
}
