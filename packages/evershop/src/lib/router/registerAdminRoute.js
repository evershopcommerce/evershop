const { addRoute } = require('./Router');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

/**
 * Register an admin route
 *
 * @param   {string}  id      Id of route, this must be unique
 * @param   {string|array} method  HTTP method, can be string like "GET", array like ["GET", "POST"]
 * @param   {string}  path    The path of route
 *
 */
exports.registerAdminRoute = (id, method, path, isApi = false, folder = '') => {
  // const route = validateRoute(id, method, path);
  const route = {
    id: String(id),
    method,
    path
  };
  route.isAdmin = true;
  route.isApi = isApi;
  route.path = route.path === '/' ? '/admin' : `/admin${path}`;
  route.folder = folder;
  addRoute(route);
};
