const { asyncMiddlewareWrapper } = require('./async');
const eNext = require('./eNext');
const isErrorHandlerTriggered = require('./isErrorHandlerTriggered');
const { getDelegates } = require('./delegate');
const { syncMiddlewareWrapper } = require('./sync');
const isNextRequired = require('./isNextRequired');

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

  // Check if the middleware is an error handler. 
  // TODO: fix me
  if (id === 'errorHandler') {
    return {
      id: String(id),
      routeId,
      before,
      after,
      middleware: (error, request, response, next) => {
        const func = require(middlewareFunc);
        if (request.currentRoute) {
          func(error, request, response, getDelegates(request), next);
        } else {
          func(error, request, response, [], next);
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
        const func = require(middlewareFunc);
        // If there response status is 404. We skip routed middlewares
        if (response.statusCode === 404 && routeId !== null && routeId !== 'site' && routeId !== 'admin') {
          next();
        } else {
          if (func.constructor.name === 'AsyncFunction') {
            asyncMiddlewareWrapper(id, func, request, response, getDelegates(request), eNext(request, response, next));
          } else {
            syncMiddlewareWrapper(id, func, request, response, getDelegates(request), eNext(request, response, next));
          }

          // If middleware function does not have next function as a parameter
          if (func.length < 4 && !isErrorHandlerTriggered(response)) {
            next();
          }
        }
      },
      scope
    };
  }
};