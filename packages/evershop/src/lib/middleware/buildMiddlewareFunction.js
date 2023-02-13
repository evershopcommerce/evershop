/* eslint-disable global-require */
const { existsSync } = require('fs');
const { sep } = require('path');
const { asyncMiddlewareWrapper } = require('./async');
const eNext = require('./eNext');
const isErrorHandlerTriggered = require('./isErrorHandlerTriggered');
const { getDelegates } = require('./delegate');
const { syncMiddlewareWrapper } = require('./sync');
const isDevelopmentMode = require('../util/isDevelopmentMode');

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
exports.buildMiddlewareFunction = function buildMiddlewareFunction(id, path) {
  if (!/^[a-zA-Z0-9_]+$/.test(id)) {
    throw new TypeError(`Middleware ID ${id} is invalid`);
  }

  const isRoutedLevel = !['all', 'global'].includes(
    path.split(sep).reverse()[1]
  );
  // Check if the middleware is an error handler.
  // TODO: fix me
  if (id === 'errorHandler' || id === 'apiErrorHandler') {
    return (error, request, response, next) => {
      const func = require(path);
      if (request.currentRoute) {
        func(error, request, response, getDelegates(request), next);
      } else {
        func(error, request, response, [], next);
      }
    };
  } else {
    return (request, response, next) => {
      // Fix middleware removed during a request
      if (isDevelopmentMode() && !existsSync(path)) {
        next();
      }
      const func = require(path);
      // If there response status is 404. We skip routed middlewares
      if (response.statusCode === 404 && isRoutedLevel) {
        next();
      } else {
        if (func.constructor.name === 'AsyncFunction') {
          asyncMiddlewareWrapper(
            id,
            func,
            request,
            response,
            getDelegates(request),
            eNext(request, response, next)
          );
        } else {
          syncMiddlewareWrapper(
            id,
            func,
            request,
            response,
            getDelegates(request),
            eNext(request, response, next)
          );
        }

        // If middleware function does not have next function as a parameter
        if (func.length < 4 && !isErrorHandlerTriggered(response)) {
          next();
        }
      }
    };
  }
};
