import { findDublicatedMiddleware } from './findDublicatedMiddleware.js';

/**
 * This function check if the new middleware function has dublicated ID or not
 *
 * @param   {array}  registeredMiddlewares  The list of registered middleware functions
 * @param   {object}  newMiddleware         The new middleware
 *
 * @return  {boolean}
 */
export function noDublicateId(registeredMiddlewares, newMiddleware) {
  if (findDublicatedMiddleware(registeredMiddlewares, newMiddleware) !== -1) {
    return false;
  } else {
    return true;
  }
}
