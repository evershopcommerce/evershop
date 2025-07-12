import { select } from '@evershop/postgres-query-builder';
import sessionStorage from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import pathToRegexp from 'path-to-regexp';
import webpack from 'webpack';
import middleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import { translate } from '../../lib/locale/translate/translate.js';
import { debug, warning } from '../../lib/log/logger.js';
import publicStatic from '../../lib/middlewares/publicStatic.js';
import themePublicStatic from '../../lib/middlewares/themePublicStatic.js';
import { pool } from '../../lib/postgres/connection.js';
import { getRoutes } from '../../lib/router/Router.js';
import { getConfig } from '../../lib/util/getConfig.js';
import isDevelopmentMode from '../../lib/util/isDevelopmentMode.js';
import isProductionMode from '../../lib/util/isProductionMode.js';
import { createConfigClient } from '../../lib/webpack/dev/createConfigClient.js';
import { isBuildRequired } from '../../lib/webpack/isBuildRequired.js';
import { getAdminSessionCookieName } from '../../modules/auth/services/getAdminSessionCookieName.js';
import { getCookieSecret } from '../../modules/auth/services/getCookieSecret.js';
import { getFrontStoreSessionCookieName } from '../../modules/auth/services/getFrontStoreSessionCookieName.js';
import { setContextValue } from '../../modules/graphql/services/contextHelper.js';
import { findRoute } from './findRoute.js';

export function addDefaultMiddlewareFuncs(app) {
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

  // Cookie parser
  app.use(cookieParser(cookieSecret));
  app.use((request, response, next) => {
    const routes = getRoutes();
    const method = request.method.toUpperCase();
    const requestPath = request.originalUrl.split('?')[0];
    const matchedRoutes = routes.filter((r) => {
      const regexp = pathToRegexp(r.path, []);
      const match = regexp.exec(requestPath);
      if (match && r.method.includes(method)) {
        return true;
      } else {
        return false;
      }
    });
    if (matchedRoutes.length > 1) {
      warning(
        `Multiple routes matched for ${requestPath}. Please check your routes: ${matchedRoutes
          .map((r) => r.id)
          .join(', ')}. Route ${matchedRoutes[0].id} will be used.`
      );
    }
    if (matchedRoutes.length) {
      request.currentRoute = matchedRoutes[0];
      next();
    } else {
      next();
    }
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
      const routes = getRoutes();
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

  app.use((request, response, next) => {
    if (!isDevelopmentMode()) {
      return next();
    }
    const routes = getRoutes();
    const route = findRoute(request);
    request.locals = request.locals || {};
    request.locals.webpackMatchedRoute = route;
    if (!route || !isBuildRequired(route)) {
      next();
    } else {
      if (!route.webpackCompiler) {
        route.webpackCompiler = webpack(createConfigClient(route));
      }
      const { webpackCompiler } = route;
      let middlewareFunc;
      if (!route.webpackMiddleware) {
        middlewareFunc = route.webpackMiddleware = middleware(webpackCompiler, {
          serverSideRender: true,
          publicPath: '/',
          stats: 'none'
        });
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
      if (!notFoundRoute.webpackCompiler) {
        notFoundRoute.webpackCompiler = webpack(
          createConfigClient(notFoundRoute)
        );
      }
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
      if (!adminNotFoundRoute.webpackCompiler) {
        adminNotFoundRoute.webpackCompiler = webpack(
          createConfigClient(adminNotFoundRoute)
        );
      }
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
  app.use((request, response, next) => {
    if (!isDevelopmentMode()) {
      return next();
    }
    const routes = getRoutes();
    const route = findRoute(request);
    request.currentRoute = route;
    if (!isBuildRequired(route)) {
      return next();
    }
    if (!route.hotMiddleware) {
      const { webpackCompiler } = route;
      const hotMiddleware = webpackHotMiddleware(webpackCompiler, {
        path: `/eHot/${route.id}`
      });
      route.hotMiddleware = hotMiddleware;
    }
    return route.hotMiddleware(request, response, () => {
      next();
    });
  });

  /** 404 Not Found handle */
  app.use((request, response, next) => {
    if (!request.currentRoute) {
      response.status(404);
      const routes = getRoutes();
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
