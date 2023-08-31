const sessionStorage = require('connect-pg-simple');
const util = require('util');
const { UNAUTHORIZED } = require('@evershop/evershop/src/lib/util/httpStatus');
const { select } = require('@evershop/postgres-query-builder');
const session = require('express-session');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  getAdminSessionCookieName
} = require('../../services/getAdminSessionCookieName');

/**
 * This is the session based authentication middleware.
 * We do not implement session middleware on API routes, instead we only load the session from the database and set the user in the context.
 * @param {*} request
 * @param {*} response
 * @param {*} delegate
 * @param {*} next
 * @returns
 */
module.exports = async (request, response, delegate, next) => {
  // Get the current route
  const { currentRoute } = request;

  // Check if the user is authenticated, if yes we assume previous authentication middleware has set the user in the context
  let currentAdminUser = request.getCurrentUser();
  if (!currentAdminUser) {
    try {
      // Get the sesionID cookies
      const cookies = request.signedCookies;
      const adminSessionCookieName = getAdminSessionCookieName();
      // Check if the sessionID cookie is present
      const sessionID = cookies[adminSessionCookieName];
      if (sessionID) {
        const storage = new (sessionStorage(session))({
          pool
        });
        // Load the session using session storage
        const getSession = util.promisify(storage.get).bind(storage);
        const adminSessionData = await getSession(sessionID);
        if (adminSessionData) {
          // Set the user in the context
          currentAdminUser = await select()
            .from('admin_user')
            .where('admin_user_id', '=', adminSessionData.userID)
            .and('status', '=', 1)
            .load(pool);

          if (currentAdminUser) {
            // Delete the password field
            delete currentAdminUser.password;
            request.locals.user = currentAdminUser;
          }
        }
      }
    } catch (e) {
      // Do nothing, the user is not logged in
    }
  }

  // If the current route is public, continue to the next middleware
  // Missing access property means private
  if (currentRoute?.access === 'public') {
    next();
    return;
  }

  if (!currentAdminUser?.uuid) {
    // Response with 401 status code
    response.status(UNAUTHORIZED);
    response.json({
      error: {
        status: UNAUTHORIZED,
        message: 'Unauthorized'
      }
    });
  } else {
    // Get user roles
    let userRoles = currentAdminUser.roles || '*';
    if (userRoles === '*') {
      next();
    } else {
      userRoles = userRoles.split(',');
      if (userRoles.includes(currentRoute.id)) {
        next();
      } else {
        response.status(UNAUTHORIZED);
        response.json({
          error: {
            status: UNAUTHORIZED,
            message: 'Unauthorized'
          }
        });
      }
    }
  }
};
