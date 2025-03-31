import { addRoute } from './Router.js';

/**
 * Register an admin route
 *
 * @param   {string}  id      Id of route, this must be unique
 * @param   {string|array} method  HTTP method, can be string like "GET", array like ["GET", "POST"]
 * @param   {string}  path    The path of route
 *
 */
export function registerAdminRoute(
  id,
  method,
  path,
  name,
  isApi = false,
  folder = ''
) {
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
  route.name = name;
  addRoute(route);
}
