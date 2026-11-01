import { normalizePort } from '../../bin/lib/normalizePort.js';
import { getBaseUrl } from '../../lib/util/getBaseUrl.js';
import { buildUrl } from './buildUrl.js';

const port = normalizePort();

/**
 * This function take a route ID, list of params and return the absolute url
 *
 * @param   {string}  routeId
 * @param   {object}  params   Key-Pair value of route params
 * @param   {object}  query    Key-Pair value of query string params, as `buildUrl` takes them
 *
 * @return  {string} The Url
 */
export const buildAbsoluteUrl = (
  routeId: string,
  params: Record<string, any> = {},
  query: Record<string, any> = {}
) => {
  const url = buildUrl(routeId, params, query).replace(/^\/|\/$/g, '');
  const homeUrl = getBaseUrl();
  return `${homeUrl}/${url}`;
};
