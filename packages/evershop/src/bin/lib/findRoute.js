import { getRoutes } from '../../lib/router/Router.js';

export function findRoute(request) {
  if (request.currentRoute) {
    return request.currentRoute;
  } else {
    const routes = getRoutes();
    const path = request.originalUrl.split('?')[0];
    if (
      path.endsWith('.js') ||
      path.endsWith('.css') ||
      path.endsWith('.json')
    ) {
      const id = path.split('/').pop().split('.')[0];
      return (
        routes.find((r) => r.id === id) ||
        routes.find((r) => r.id === 'notFound')
      );
    } else if (path.includes('/eHot/')) {
      const id = path.split('/').pop();
      return routes.find((r) => r.id === id);
    } else {
      return routes.find((r) => r.id === 'notFound');
    }
  }
}
