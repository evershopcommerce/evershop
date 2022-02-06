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
  middleware,
  routeId = null,
  before = null,
  after = null
) {
  if (!/^[a-zA-Z1-9.]/g.test(id)) {
    throw new TypeError(`Middleware ID ${id} is invalid`);
  }

  // Check if the middleware is an error handler
  if (middleware.length === 5) {
    return {
      id: String(id),
      routeId,
      before,
      after,
      middleware(error, request, response, next) {
        if (request.currentRoute) {
          middleware(error, request, response, stack.delegates[request.currentRoute.id], next);
        } else {
          middleware(error, request, response, [], next);
        }
      }
    };
  } else {
    return {
      id: String(id),
      routeId,
      before,
      after,
      middleware(request, response, next) {
        logger.log('info', `Executing middleware ${id}`);

        // If there response status is 404. We skip routed middlewares
        if (response.statusCode === 404 && routeId !== null && routeId !== 'site') {
          return next();
        }

        // If middleware contains requests for 4 arguments (request, response, stack, next).
        if (middleware.length === 4) {
          const delegate = middleware(
            request,
            response,
            stack.delegates[request.currentRoute.id],
            next
          );

          // Insert delegate to the list of delegations
          stack.delegates[request.currentRoute.id][id] = delegate;

          if (delegate instanceof Promise) {
            delegate.catch((e) => {
              logger.log('error', `Exception in middleware ${id}`, { message: e.message, stack: e.stack });
              return next(e);
            });
          }

          return delegate;
        } else {
          const delegate = middleware(
            request,
            response,
            stack.delegates[request.currentRoute.id]
          );

          // Insert delegate to the list of delegations
          stack.delegates[request.currentRoute.id][id] = delegate;
          if (delegate instanceof Promise) {
            delegate.catch((e) => {
              logger.log('error', `Exception in middleware ${id}`, { message: e.message, stack: e.stack });
              return next(e);
            });
          }
          // If the middleware returns an error. Call the errorHandler middleware.
          if (delegate instanceof Error) {
            return next(delegate);
          } else {
            return next();
          }
        }
      }
    };
  }
};
