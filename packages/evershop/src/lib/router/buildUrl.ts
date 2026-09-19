import {
  applyLocalePrefix,
  getLocaleContextIso
} from '../locale/activeDictionary.js';
import { compile } from '../pathToRegexp.js';
import { getRoutes } from './Router.js';

/**
 * Build a URL from a route ID + params, **localized** to the current request locale
 * (a `/<locale>` prefix is added for a non-default storefront locale; never for admin
 * routes or the default locale — spec §6.10). Isomorphic: safe during SSR and on the
 * client.
 *
 * Use this for **route-based** links (cart, checkout, account, a route you have an id
 * for). For an **already-built URL string** — e.g. a `url_rewrite` entity path inside a
 * GraphQL resolver — use `localizeUrl` instead (`buildUrl` needs a route id, and its
 * locale source isn't populated during GraphQL resolution). Both delegate to the same
 * `applyLocalePrefix` primitive.
 *
 * @param   {string}  routeId
 * @param   {object}  params   Key-Pair value of route params
 * @param   {object}  query    Key-Pair value of query parameters
 *
 * @return  {string} The localized Url
 */
export const buildUrl = (
  routeId: string,
  params: Record<string, any> = {},
  query: Record<string, any> = {}
): string => {
  const routes = getRoutes();
  const route = routes.find((r) => r.id === routeId);
  if (route === undefined) {
    throw new Error(`Route ${routeId} is not existed`);
  }

  const toPath = compile(route.path);
  try {
    // Prefix static-route URLs with /<locale> (spec §6.10). No-op for admin routes,
    // the default locale, and an admin context — and dormant until the locale context
    // is populated (per-render setSSRContext / client eContext, P6).
    const url = applyLocalePrefix(
      toPath(params),
      getLocaleContextIso(),
      route.isAdmin
    );

    if (Object.keys(query).length > 0) {
      const queryPairs: string[] = [];

      for (const [key, value] of Object.entries(query)) {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            queryPairs.push(
              `${encodeURIComponent(key)}[]=${encodeURIComponent(String(item))}`
            );
          });
        } else if (value !== null && value !== undefined) {
          // Handle simple values
          queryPairs.push(
            `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
          );
        }
      }

      if (queryPairs.length > 0) {
        return `${url}?${queryPairs.join('&')}`;
      }
    }

    return url;
  } catch (e) {
    throw new Error(`Could not build url for route ${routeId}. ${e.message}`);
  }
};
