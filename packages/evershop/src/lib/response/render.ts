import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { FETCH_LOCALE_PATCH } from '../../components/common/react/server/fetchLocalePatch.js';
import { getNotifications } from '../../modules/base/services/notifications.js';
import { getPageMetaInfo } from '../../modules/cms/services/pageMetaInfo.js';
import { Config } from '../../types/appContext.js';
import { EvershopRequest } from '../../types/request.js';
import { EvershopResponse } from '../../types/response.js';
import { CONSTANTS } from '../helpers.js';
import { getPageDictionary } from '../locale/dictionary.js';
import { getLocaleContext } from '../locale/localeContext.js';
import { error } from '../log/logger.js';
import { get } from '../util/get.js';
import { getConfig } from '../util/getConfig.js';
import isProductionMode from '../util/isProductionMode.js';
import { processPreloadImages } from '../util/preloadScan.js';
import { getValueSync } from '../util/registry.js';
import { getRouteBuildPath } from '../webpack/getRouteBuildPath.js';
import { serializeEContext } from './serializeEContext.js';

function normalizeAssets(assets) {
  if (typeof assets === 'object' && !Array.isArray(assets) && assets !== null) {
    return Object.values(assets);
  }

  return Array.isArray(assets) ? assets : [assets];
}

function buildContextData(
  request: EvershopRequest,
  response: EvershopResponse
) {
  const pageMeta = getPageMetaInfo(request);
  const appConfig = getValueSync<Config>(
    'appConfig',
    {
      tax: {
        priceIncludingTax: getConfig('pricing.tax.price_including_tax', false)
      },
      catalog: {
        imageDimensions: {
          width: getConfig('catalog.product.image.width', 1200),
          height: getConfig('catalog.product.image.height', 1200)
        }
      },
      pageMeta: pageMeta
    },
    { request, response },
    (value) => value && typeof value === 'object' && !Array.isArray(value)
  );
  const config = Object.assign({}, appConfig, { pageMeta });
  // Locale is resolved per-request by the P4 middleware into the ALS; read it back here
  // (sync). The middleware + ALS is the single locale seam — resolvers read it via
  // getActiveLocale(). Off the middleware path (e.g. tests), fall back to the config
  // language. `translations` is the dictionary `_()` reads on the client: the full locale
  // dict (per-route slicing was attempted in P6c and backed out — §6.22; a webpack
  // key-collector slice is the future optimization). Client (eContext) + SSR
  // (setSSRContext) share the same object.
  const localeCtx = getLocaleContext();
  const locale = localeCtx?.locale ?? getConfig('shop.language', 'en');
  const contextValue = {
    graphqlResponse: get(response, 'locals.graphqlResponse', {}),
    config: config,
    propsMap: get(response, 'locals.propsMap', {}),
    widgets: get(response, 'locals.widgets', []),
    notifications: getNotifications(request),
    locale,
    defaultLocale: localeCtx?.defaultLocale ?? locale,
    availableLocales: localeCtx?.available ?? [locale],
    translations: localeCtx ? getPageDictionary(request.currentRoute, locale) : {}
  };
  return contextValue;
}

function renderDevelopment(
  request: EvershopRequest,
  response: EvershopResponse
) {
  const route = request.currentRoute;
  const classes = route.isAdmin
    ? `admin ${route.id}`
    : `frontStore ${route.id}`;
  if (!route) {
    // In testing mode, we do not have devMiddleware
    response.send(`
            <html>
              <head>
                <title>Sample Html Response</title>
                <script>Sample Html Response</script>
              </head>
              <body>
              </body>
            </html>
            `);
    return;
  }
  const contextValue = buildContextData(request, response);
  const safeContextValue = serializeEContext(contextValue);
  const langCode = contextValue.locale;
  const scriptPath = route.isAdmin ? '/backend/admin-main.js' : '/main.js';
  // Storefront only: same X-Locale fetch patch as production (Server.tsx). Dev writes its
  // own HTML head, so inject it here too or client-side API calls would miss the locale.
  const localePatchScript = route.isAdmin
    ? ''
    : `<script>${FETCH_LOCALE_PATCH}</script>`;
  response.send(`
            <!doctype html><html lang="${langCode}">
                <head>
                  <script>var eContext = ${safeContextValue}</script>
                  ${localePatchScript}
                </head>
                <body class="${classes}">
                <div id="app"></div>
                 <script defer src="${scriptPath}"></script>
                </body >
            </html >
  `);
}

function renderProduction(request, response, next?) {
  const route = request.currentRoute;
  // Phase 2: one server (SSR) bundle per context — `frontStore/server/index.js`
  // or `admin/server/index.js` — instead of one bundle per route. The bundle
  // registers every route's component map; `renderHtml` + `Area` select the
  // current route via `getAreaComponents(route.id)` at render time. Client
  // assets (below) stay per-route.
  const serverIndexPath = path.resolve(
    CONSTANTS.BUILDPATH,
    route.isAdmin ? 'admin' : 'frontStore',
    'server',
    'index.js'
  );
  const assetsPath = path.resolve(
    getRouteBuildPath(route),
    'client',
    'index.json'
  );
  const assets = JSON.parse(fs.readFileSync(assetsPath, 'utf8'));
  const cssList = [] as string[];
  for (let i = 0; i < assets.css.length; i++) {
    const cssFilePath = path.resolve(
      getRouteBuildPath(route),
      'client',
      path.basename(assets.css[i])
    );
    if (fs.existsSync(cssFilePath)) {
      const cssContent = fs.readFileSync(cssFilePath, 'utf8');
      // Inline the css content to reduce the number of requests
      cssList.push(cssContent);
    }
  }
  const contextValue = buildContextData(request, response);
  const langCode = contextValue.locale;
  const safeContextValue = serializeEContext(contextValue);
  import(pathToFileURL(serverIndexPath).toString())
    .then((module) => {
      // The SSR bridge (setSSRContext) lives in `render.tsx` — it must run inside the
      // route's webpack server bundle so it writes the bundle's own activeDictionary
      // instance (the one the bundled `_()` reads). render.ts only ships the locale +
      // `translations` in eContext (via buildContextData); render.tsx reads them.
      const source = processPreloadImages(
        module.default(
          request.currentRoute,
          assets.js,
          cssList,
          safeContextValue,
          langCode
        )
      );
      response.send(source);
    })
    .catch((e) => {
      error(e);
      // This render runs inside a floated promise, so a throw here never reaches
      // the calling middleware's try/catch. Without forwarding it, the request
      // hangs until the socket/requestTimeout fires (no status, no body). Hand it
      // to the error handler so the client gets a proper 500 instead.
      if (typeof next === 'function' && !response.headersSent) {
        next(e);
      }
    });
}

export function render(request, response, next?) {
  if (isProductionMode()) {
    renderProduction(request, response, next);
  } else {
    renderDevelopment(request, response);
  }
}
