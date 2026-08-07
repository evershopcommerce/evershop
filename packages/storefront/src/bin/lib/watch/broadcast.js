import { getRoutes } from '../../../lib/router/Router.js';

export const broadcast = async () => {
  const routes = getRoutes();
  routes.forEach((route) => {
    if (route.hotMiddleware) {
      const { hotMiddleware } = route;
      hotMiddleware.publish({
        action: 'serverReloaded'
      });
    }
  });
};
