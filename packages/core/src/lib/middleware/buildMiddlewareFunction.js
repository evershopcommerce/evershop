const { asyncMiddlewareWrapper } = require('./async');
const { stack } = require('./stack');
const { syncMiddlewareWrapper } = require('./sync');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

/**
 * This function takes the defined middleware function and return a new one with wrapper
 *
 * @param {string} id
 * @param {function} middleware: The middleware function
 * @param {string} routeId: The route Id
 * @param {string} before: The middleware function that executes after this one
 * @param {string} after: The middleware function that executes before this one
 * @returns {object} the middleware object
 * @throws
 */
exports.buildMiddlewareFunction = function buildMiddlewareFunction(
  id,
  middlewareFunc,
  routeId = null,
  before = null,
  after = null,
  scope = 'app'
) {
  if (!/^[a-zA-Z0-9_]+$/.test(id)) {
    throw new TypeError(`Middleware ID ${id} is invalid`);
  }

  // Check if the middleware is an error handler
  if (middlewareFunc.length === 5) {
    return {
      id: String(id),
      routeId,
      before,
      after,
      middleware: (error, request, response, next) => {
        if (request.currentRoute) {
          middlewareFunc(error, request, response, stack.delegates[request.currentRoute.id], next);
        } else {
          middlewareFunc(error, request, response, [], next);
        }
      },
      scope
    };
  } else {
    return {
      id: String(id),
      routeId,
      before,
      after,
      middleware: (request, response, next) => {
        // If there response status is 404. We skip routed middlewares
        if (response.statusCode === 404 && routeId !== null && routeId !== 'site' && routeId !== 'admin') {
          next();
        } else {
          let delegate;
          if (middlewareFunc.constructor.name === 'AsyncFunction') {
            asyncMiddlewareWrapper(id, middlewareFunc, request, response, stack.delegates[request.currentRoute.id], next);
          } else {
            syncMiddlewareWrapper(id, middlewareFunc, request, response, stack.delegates[request.currentRoute.id], next);
          }

          //stack.delegates[request.currentRoute.id][id] = delegate;
          // If middleware function does not have next function as a parameter
          if (middlewareFunc.length < 4) {
            console.log('calling next', id);
            next();
          }
        }
      },
      scope
    };
  }
};

function noop() { }

function eNext(response, next) {
  // Check if the errorHandler is triggered or not
  if (response.locals.errorHandlerTriggered !== true) {
    next;
  } else {
    return noop;
  }
}