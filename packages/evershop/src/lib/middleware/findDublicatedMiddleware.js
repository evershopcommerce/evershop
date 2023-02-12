// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

exports.findDublicatedMiddleware = function findDublicatedMiddleware(
  registeredMiddlewares,
  newMiddleware
) {
  return registeredMiddlewares.findIndex(
    (middleware) =>
      middleware.id === newMiddleware.id &&
      (middleware.routeId === null ||
        middleware.scope === 'app' ||
        newMiddleware.routeId === null ||
        middleware.routeId === newMiddleware.routeId ||
        (middleware.scope === newMiddleware.scope &&
          ([middleware.routeId, newMiddleware.routeId].includes('admin') ||
            [middleware.routeId, newMiddleware.routeId].includes(
              'frontStore'
            )))) &&
      middleware.region === newMiddleware.region
  );
};
