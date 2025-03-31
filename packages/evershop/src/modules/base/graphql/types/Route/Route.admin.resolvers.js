import { getRoutes } from '@evershop/evershop/src/lib/router/Router.js';

export default {
  Query: {
    routes: () => {
      const routes = getRoutes();
      return routes.filter((route) => route.name);
    }
  }
};
