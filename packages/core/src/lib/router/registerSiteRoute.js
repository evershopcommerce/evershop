const { routes } = require('./routes');
const { validateRoute } = require('./validateRoute');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

/**
 * Register a site route
 *
 * @param   {string}  id      Id of route, this must be unique
 * @param   {string|array} method  HTTP method, can be string like "GET", array like ["GET", "POST"]
 * @param   {string}  path    The path of route
 *
 */
exports.registerSiteRoute = (id, method, path, isApi = false) => {
  const route = validateRoute(id, method, path);
  route.isAdmin = false;
  route.isApi = isApi;
  routes.push(route);
};
