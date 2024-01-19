const normalizePort = require('@evershop/evershop/bin/lib/normalizePort');
const { buildUrl } = require('./buildUrl');
const { getConfig } = require('../util/getConfig');

const port = normalizePort();

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};
/**
 * This function take a route ID, list of params and return the absolute url
 *
 * @param   {string}  routeId
 * @param   {object}  params   Key-Pair value of route params
 *
 * @return  {string} The Url
 */
exports.buildAbsoluteUrl = (routeId, params = {}) => {
  const url = buildUrl(routeId, params).replace(/^\/|\/$/g, '');
  const homeUrl = getConfig('shop.homeUrl', `http://localhost:${port}`).replace(
    /^\/|\/$/g,
    ''
  );
  return `${homeUrl}/${url}`;
};
