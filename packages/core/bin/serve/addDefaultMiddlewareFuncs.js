const bodyParser = require('body-parser');

module.exports = exports = {};

exports.addDefaultMiddlewareFuncs = function addDefaultMiddlewareFuncs(app, routes) {
  routes.forEach((r) => {
    const currentRouteMiddleware = (request, response, next) => {
      // eslint-disable-next-line no-underscore-dangle
      request.currentRoute = r;
      next();
    };
    r.method.forEach((method) => {
      switch (method.toUpperCase()) {
        case 'GET':
          app.get(r.path, currentRouteMiddleware);
          break;
        case 'POST':
          app.post(r.path, currentRouteMiddleware);
          break;
        case 'PUT':
          app.put(r.path, currentRouteMiddleware);
          break;
        case 'DELETE':
          app.delete(r.path, currentRouteMiddleware);
          break;
        default:
          app.get(r.path, currentRouteMiddleware);
          break;
      }
    });

    /** 405 Not Allowed handle */
    app.all(r.path, (request, response, next) => {
      // eslint-disable-next-line no-underscore-dangle
      if (request.currentRoute && !request.currentRoute.method.includes(request.method)) {
        response.status(405).send('Method Not Allowed');
      } else {
        next();
      }
    });

    // Body parser for API routes
    if (r.isApi) {
      app.all(r.path, bodyParser.json({ inflate: false }));
      app.all(r.path, bodyParser.urlencoded({ extended: true }));
    }

    // eslint-disable-next-line no-underscore-dangle
    // eslint-disable-next-line no-param-reassign
    // eslint-disable-next-line no-underscore-dangle
    r.__BUILDREQUIRED__ = true;
  });


  /** 404 Not Found handle */
  app.all('*', (request, response, next) => {
    if (!request.currentRoute) {
      response.status(404);
      request.currentRoute = routes.find((r) => r.id === 'notFound');
      next();
    } else {
      next();
    }
  });
}