const logger = require('../log/logger');
const { stack } = require('./stack');

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
        logger.log('info', `Executing middleware ${id}`);

        // If there response status is 404. We skip routed middlewares
        if (response.statusCode === 404 && routeId !== null && routeId !== 'site' && routeId !== 'admin') {
          return next();
        }

        // If middleware contains requests for 4 arguments (request, response, stack, next).
        if (middlewareFunc.length === 4) {
          const delegate = middlewareFunc(
            request,
            response,
            stack.delegates[request.currentRoute.id],
            next
          );

          // TODO: There is an issue when the middlewaare is synchonous function. Any error occurred will trigger the default error handler
          // Insert delegate to the list of delegations
          stack.delegates[request.currentRoute.id][id] = delegate;
          if (delegate instanceof Promise) {
            delegate.catch((e) => {
              logger.log('error', `Exception in middleware ${id}`, { message: e.message, stack: e.stack });
              // We call the error handler middleware if it was not called by another middleware
              if (response.locals.errorHandlerTriggered !== true) {
                return next(e);
              } else {
                return null;
              }
            });
          }

          return delegate;
        } else {
          const delegate = middlewareFunc(
            request,
            response,
            stack.delegates[request.currentRoute.id]
          );

          // Insert delegate to the list of delegations
          stack.delegates[request.currentRoute.id][id] = delegate;
          if (delegate instanceof Promise) {
            delegate.catch((e) => {
              logger.log('error', `Exception in middleware ${id}`, { message: e.message, stack: e.stack });
              // We call the error handler middleware if it was not called by another middleware
              if (response.locals.errorHandlerTriggered !== true) {
                return next(e);
              } else {
                return null;
              }
            });
          }
          // If the middleware returns an error. Call the errorHandler middleware.
          if (delegate instanceof Error) {
            if (response.locals.errorHandlerTriggered !== true) {
              return next(delegate);
            }
          } else {
            return next();
          }
        }
      },
      scope
    };
  }
};
