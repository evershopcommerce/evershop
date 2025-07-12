import { existsSync } from 'fs';
import { sep } from 'path';
import { pathToFileURL } from 'url';
import { debug, error } from '../log/logger.js';
import isDevelopmentMode from '../util/isDevelopmentMode.js';
import isProductionMode from '../util/isProductionMode.js';
import { hasDelegate, setDelegate } from './delegate.js';
import eNext from './eNext.js';
import isErrorHandlerTriggered from './isErrorHandlerTriggered.js';

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
export function buildMiddlewareFunction(id, path) {
  if (!/^[a-zA-Z0-9_]+$/.test(id)) {
    throw new TypeError(`Middleware ID ${id} is invalid`);
  }

  const isRoutedLevel = !['all', 'global'].includes(
    path.split(sep).reverse()[1]
  );
  // Check if the middleware is an error handler.
  // TODO: fix me
  if (id === 'errorHandler' || id === 'apiErrorHandler') {
    return async (error, request, response, next) => {
      const m = isDevelopmentMode()
        ? await import(`${pathToFileURL(path)}?t=${Date.now()}`)
        : await import(pathToFileURL(path));
      const func = m.default;
      if (request.currentRoute) {
        await func(error, request, response, next);
      } else {
        await func(error, request, response, next);
      }
    };
  } else {
    return async (request, response, next) => {
      const startTime = process.hrtime();
      const debuging = {
        id
      };
      response.debugMiddlewares.push(debuging);
      // If there response status is 404. We skip routed middlewares
      if (response.statusCode === 404 && isRoutedLevel) {
        next();
      } else {
        try {
          const m = isDevelopmentMode()
            ? await import(`${pathToFileURL(path)}?t=${Date.now()}`)
            : await import(pathToFileURL(path));
          let func = m.default;
          if (!func) {
            if (isProductionMode()) {
              throw new Error(
                `Middleware ${id} is invalid. It should provide a function as default export.`
              );
            } else {
              func = () => {
                debug(
                  `Middleware ${id} is not implemented yet. Please implement it.`
                );
              };
            }
          }
          if (func.length === 3) {
            await func(request, response, (err) => {
              const endTime = process.hrtime(startTime);
              debuging.time = endTime[1] / 1000000;
              eNext(request, response, next)(err);
            });
          } else {
            const returnValue = await func(request, response);
            if (!hasDelegate(id, request)) {
              setDelegate(id, returnValue, request);
            }
            const endTime = process.hrtime(startTime);
            debuging.time = endTime[1] / 1000000;
            eNext(request, response, next)();
          }
        } catch (e) {
          // Log the error
          e.message = `Exception in middleware ${id}: ${e.message}`;
          error(e);
          // Call error handler middleware if it is not called yet
          next(e);
        }
      }
    };
  }
}
