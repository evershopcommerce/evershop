import { compile } from '../pathToRegexp.js';
import { getRoutes } from './Router.js';

/**
 * This function take a route ID, list of params and return the url
 *
 * @param   {string}  routeId
 * @param   {object}  params   Key-Pair value of route params
 * @param   {object}  query    Key-Pair value of query parameters
 *
 * @return  {string} The Url
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
    const url = toPath(params);

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
