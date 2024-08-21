const { getRoutes } = require('@evershop/evershop/src/lib/router/Router');

module.exports = {
  Query: {
    routes: () => {
      const routes = getRoutes();
      return routes.filter((route) => route.name);
    }
  }
};
