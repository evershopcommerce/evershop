import { select } from '@evershop/postgres-query-builder';
import sessionStorage from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import pathToRegexp from 'path-to-regexp';
import { getDictionary } from '../../lib/locale/dictionary.js';
import { runWithLocale } from '../../lib/locale/localeContext.js';
import {
  pickApiLocale,
  pickStorefrontLocale
} from '../../lib/locale/localeResolution.js';
import { translate } from '../../lib/locale/translate/translate.js';
import { debug, warning } from '../../lib/log/logger.js';
import publicStatic from '../../lib/middlewares/publicStatic.js';
import themePublicStatic from '../../lib/middlewares/themePublicStatic.js';
import { pool } from '../../lib/postgres/connection.js';
import { getRoutes } from '../../lib/router/Router.js';
import { getConfig } from '../../lib/util/getConfig.js';
import isDevelopmentMode from '../../lib/util/isDevelopmentMode.js';
import isProductionMode from '../../lib/util/isProductionMode.js';
import { getAdminSessionCookieName } from '../../modules/auth/services/getAdminSessionCookieName.js';
import { getCookieSecret } from '../../modules/auth/services/getCookieSecret.js';
import { getFrontStoreSessionCookieName } from '../../modules/auth/services/getFrontStoreSessionCookieName.js';
import { setPageMetaInfo } from '../../modules/cms/services/pageMetaInfo.js';
import {
  getAdminLanguage,
  getEnabledLanguages,
  getStoreLanguage
} from '../../modules/setting/services/setting.js';
import { getDevMiddleware, getHotMiddleware } from './devEnvHelper.js';

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
  } as session.SessionOptions;

  if (isProductionMode()) {
    app.set('trust proxy', 1);
    sess.cookie!.secure = false;
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

  // Locale resolution + URL-prefix strip (spec §6.9). Runs BEFORE route matching so the
  // matcher and the url_rewrite lookup below see the canonical path via request.localePath,
  // while request.originalUrl stays prefixed (canonical/SEO). Wraps the rest of the request
  // in runWithLocale so translate()/resolvers see the locale.
  app.use(async (request, response, next) => {
    if (process.env.NODE_ENV === 'test') {
      return next();
    }
    const fullPath = request.originalUrl.split('?')[0];
    // API routes are RESTful and unprefixed (D4) — the locale arrives in the `X-Locale`
    // header (spec §6.13), not the path. Wrap so translate()/resolvers see it.
    if (fullPath === '/api' || fullPath.startsWith('/api/')) {
      // Admin API (e.g. /api/admin/graphql) runs in the admin language. NOTE: admin REST
      // APIs declare bare paths (/api/products/:id, not /api/admin/*), so they fall into
      // the storefront branch below — an accepted minor edge (they rarely render
      // translated text; admin-route URLs skip prefixing via route.isAdmin regardless).
      if (fullPath.startsWith('/api/admin')) {
        const locale = await getAdminLanguage();
        request.locale = locale;
        return runWithLocale(
          {
            locale,
            defaultLocale: locale,
            available: [locale],
            dict: getDictionary(locale),
            isAdmin: true
          },
          () => next()
        );
      }
      // Storefront API: honor X-Locale only when it is an enabled locale, else the store
      // default (a header must not be able to request a disabled/arbitrary language).
      const apiDefaultLocale = await getStoreLanguage();
      const apiEnabled = await getEnabledLanguages();
      const apiLocale = pickApiLocale(
        request.headers['x-locale'],
        apiEnabled,
        apiDefaultLocale
      );
      request.locale = apiLocale;
      return runWithLocale(
        {
          locale: apiLocale,
          defaultLocale: apiDefaultLocale,
          available: apiEnabled,
          dict: getDictionary(apiLocale),
          isAdmin: false
        },
        () => next()
      );
    }
    // Admin runs in its own language; never prefixed.
    if (fullPath === '/admin' || fullPath.startsWith('/admin/')) {
      const locale = await getAdminLanguage();
      request.locale = locale;
      request.localePath = fullPath;
      return runWithLocale(
        {
          locale,
          defaultLocale: locale,
          available: [locale],
          dict: getDictionary(locale),
          isAdmin: true
        },
        () => next()
      );
    }
    // Storefront: strip a leading /<locale> only for an enabled, non-default locale.
    const defaultLocale = await getStoreLanguage();
    const enabled = await getEnabledLanguages();
    const { locale, isPrefixed } = pickStorefrontLocale(
      fullPath.split('/')[1],
      enabled,
      defaultLocale
    );
    request.locale = locale;
    request.localePath = isPrefixed
      ? `/${fullPath.split('/').slice(2).join('/')}`
      : fullPath;
    return runWithLocale(
      {
        locale,
        defaultLocale,
        available: enabled,
        dict: getDictionary(locale),
        isAdmin: false
      },
      () => next()
    );
  });

  app.use((request, response, next) => {
    const routes = getRoutes();
    const method = request.method.toUpperCase();
    const requestPath =
      request.localePath ?? request.originalUrl.split('?')[0];
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
    // Get the request path (locale-prefix stripped), remove '/' from both ends
    const path = (request.localePath ?? request.originalUrl.split('?')[0]).replace(
      /^\/|\/$/g,
      ''
    );
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
          const keys: any[] = [];
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
    // Admin webpack dev middleware - only for /backend/* paths
    app.use((request, response, next) => {
      if (request.path.startsWith('/backend/')) {
        const adminDevMiddleware = getDevMiddleware(true);
        adminDevMiddleware.waitUntilValid(() => {
          const { stats } = adminDevMiddleware.context;
          if (stats) {
            response.locals.jsonWebpackStats = stats.toJson();
          }
        });
        adminDevMiddleware(request, response, next);
      } else {
        next();
      }
    });

    app.use((request, response, next) => {
      if (request.path.startsWith('/__webpack_hmr_admin')) {
        const adminHotMiddleware = getHotMiddleware(true);
        adminHotMiddleware(request, response, next);
      } else {
        next();
      }
    });

    // Frontstore webpack dev middleware - for all other paths
    app.use((request, response, next) => {
      if (
        !request.path.startsWith('/backend/') &&
        !request.path.startsWith('/__webpack_hmr_admin')
      ) {
        const frontstoreDevMiddleware = getDevMiddleware(false);
        frontstoreDevMiddleware.waitUntilValid(() => {
          const { stats } = frontstoreDevMiddleware.context;
          if (stats) {
            response.locals.jsonWebpackStats = stats.toJson();
          }
        });
        frontstoreDevMiddleware(request, response, next);
      } else {
        next();
      }
    });

    app.use((request, response, next) => {
      if (request.path.startsWith('/__webpack_hmr_frontstore')) {
        const frontstoreHotMiddleware = getHotMiddleware(false);
        frontstoreHotMiddleware(request, response, next);
      } else {
        next();
      }
    });
  }
  /** 404 Not Found handle */
  app.use((request, response, next) => {
    if (!request.currentRoute) {
      response.status(404);
      const routes = getRoutes();
      request.currentRoute = routes.find((r) => r.id === 'notFound');
      setPageMetaInfo(request, {
        title: translate('Not found'),
        description: translate('Not found')
      });
      next();
    } else {
      next();
    }
  });
}
