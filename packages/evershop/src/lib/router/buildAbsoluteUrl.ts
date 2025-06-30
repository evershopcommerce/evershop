import { normalizePort } from '../../bin/lib/normalizePort.js';
import { getConfig } from '../util/getConfig.js';
import { buildUrl } from './buildUrl.js';

const port = normalizePort();

/**
 * This function take a route ID, list of params and return the absolute url
 *
 * @param   {string}  routeId
 * @param   {object}  params   Key-Pair value of route params
 *
 * @return  {string} The Url
 */
export const buildAbsoluteUrl = (
  routeId: string,
  params: Record<string, any> = {}
) => {
  const url = buildUrl(routeId, params).replace(/^\/|\/$/g, '');
  const homeUrl = getConfig('shop.homeUrl', `http://localhost:${port}`).replace(
    /^\/|\/$/g,
    ''
  );
  return `${homeUrl}/${url}`;
};
