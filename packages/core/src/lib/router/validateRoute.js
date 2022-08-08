const { getRoutes } = require('./Router');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

/**
 * This function validate where ther the id of route is already existed or not.
 * It return a route object
 *
 * @param   {string}  id      Route ID
 * @param {string||array} method HTTP method, can be string like "GET", array like ["GET", "POST"]
 * @param   {string}  path    The route path
 *
 * @return  {object}          The Route object
 */
exports.validateRoute = (id, method, path) => {
  const routes = getRoutes();
  if (routes.find((r) => r.id === id) !== undefined) {
    throw new Error(`Route with ID ${String(id)} is already existed`);
  }
  return {
    id: String(id),
    method,
    path
  };
};
