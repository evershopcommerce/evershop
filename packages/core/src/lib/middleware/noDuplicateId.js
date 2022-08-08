// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

/**
 * This function check if the new middleware function has dublicated ID or not
 *
 * @param   {array}  registeredMiddlewares  The list of registered middleware functions
 * @param   {object}  newMiddleware         The new middleware
 *
 * @return  {boolean}
 */
exports.noDublicateId = function noDublicateId(registeredMiddlewares, newMiddleware) {
  if (
    registeredMiddlewares.findIndex(
      (middleware) => middleware.id === newMiddleware.id
        && (
          middleware.routeId === null
          || newMiddleware.routeId === null
          || middleware.routeId === newMiddleware.routeId
          || (middleware.scope === newMiddleware.scope && (
            [middleware.routeId, newMiddleware.routeId].includes('admin')
            || [middleware.routeId, newMiddleware.routeId].includes('site')
          )
          )
        )
    ) !== -1
  ) {
    return false;
  } else {
    return true;
  }
};
