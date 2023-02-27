const { getAdminRoutes } = require('@evershop/evershop/src/lib/router/Router');

module.exports = exports = {};

exports.prepare = function prepare(app, middlewares, routes) {
  const adminRoutes = getAdminRoutes();

  middlewares.forEach((m) => {
    if (m.routeId === null) {
      app.use(m.middleware);
    } else if (m.routeId === 'admin') {
      adminRoutes.forEach((route) => {
        if (route.id !== 'adminStaticAsset' || m.id === 'isAdmin') {
          route.method.forEach((method) => {
            switch (method.toUpperCase()) {
              case 'GET':
                app.get(route.path, m.middleware);
                break;
              case 'POST':
                app.post(route.path, m.middleware);
                break;
              case 'PUT':
                app.put(route.path, m.middleware);
                break;
              case 'DELETE':
                app.delete(route.path, m.middleware);
                break;
              default:
                app.get(route.path, m.middleware);
                break;
            }
          });
        }
      });
    } else if (m.routeId === 'frontStore') {
      app.all('*', (request, response, next) => {
        const route = request.currentRoute;
        if (route.isAdmin === true || route.id === 'staticAsset') {
          return next();
        }
        return m.middleware(request, response, next);
      });
    } else {
      const route = routes.find((r) => r.id === m.routeId);
      if (route !== undefined) {
        route.method.forEach((method) => {
          switch (method.toUpperCase()) {
            case 'GET':
              app.get(route.path, m.middleware);
              break;
            case 'POST':
              app.post(route.path, m.middleware);
              break;
            case 'PUT':
              app.put(route.path, m.middleware);
              break;
            case 'DELETE':
              app.delete(route.path, m.middleware);
              break;
            default:
              app.get(route.path, m.middleware);
              break;
          }
        });
      }
    }
  });
};
