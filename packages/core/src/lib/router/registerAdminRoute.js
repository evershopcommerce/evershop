const { routes } = require('./routes');
const { validateRoute } = require('./validateRoute');

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
exports.registerAdminRoute = (id, method, path) => {
  const route = validateRoute(id, method, path);
  route.isAdmin = true;
  route.path = route.path === '/' ? '/admin' : `/admin${path}`;
  routes.push(route);
};
