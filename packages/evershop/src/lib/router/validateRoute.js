import { getRoutes } from './Router.js';

/**
 * This function validates if the id of a route already exists or not.
 * It returns a route object
 *
 * @param   {string}  id      Route ID
 * @param {string||array} method HTTP method, can be string like "GET", array like ["GET", "POST"]
 * @param   {string}  path    The route path
 *
 * @return  {object}          The Route object
 */
export const validateRoute = (id, method, path) => {
  const routes = getRoutes();
  if (routes.find((r) => r.id === id) !== undefined) {
    throw new Error(`Route with ID ${String(id)} already exists`);
  }
  return {
    id: String(id),
    method,
    path
  };
};
