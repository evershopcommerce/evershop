const { addRoute } = require('./Router');
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
exports.registerSiteRoute = (id, method, path, isApi = false, folder = '') => {
  //const route = validateRoute(id, method, path);
  const route = {
    id: String(id),
    method,
    path,
  }
  route.isAdmin = false;
  route.isApi = isApi;
  route.folder = folder;
  addRoute(route);
};
