import { getRoutes } from '@evershop/evershop/src/lib/router/Router.js';

export const broadcash = async () => {
  const routes = getRoutes();
  routes.forEach((route) => {
    if (
      !route.isApi &&
      !['staticAsset', 'adminStaticAsset'].includes(route.id)
    ) {
      const { hotMiddleware } = route;
      if (hotMiddleware) {
        hotMiddleware.publish({
          action: 'serverReloaded'
        });
      }
    }
  });
};
