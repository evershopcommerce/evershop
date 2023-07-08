const { getRoutes } = require('./Router');
const { compile } = require('../pathToRegexp');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};
/**
 * This function take a route ID, list of params and return the url
 *
 * @param   {string}  routeId
 * @param   {object}  params   Key-Pair value of route params
 *
 * @return  {string} The Url
 */
exports.buildUrl = (routeId, params = {}) => {
  const routes = getRoutes();
  const route = routes.find((r) => r.id === routeId);
  if (route === undefined) {
    throw new Error(`Route ${routeId} is not existed`);
  }

  const toPath = compile(route.path);
  try {
    const url = toPath(params);
    return url;
  } catch (e) {
    throw new Error(`Could not build url for route ${routeId}. ${e.message}`);
  }
};
