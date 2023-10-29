const sessionStorage = require('connect-pg-simple');
const util = require('util');
const { select } = require('@evershop/postgres-query-builder');
const session = require('express-session');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  getAdminSessionCookieName
} = require('../../services/getAdminSessionCookieName');
const { setContextValue } = require('../../../graphql/services/contextHelper');

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
            setContextValue(request, 'user', currentAdminUser);
          }
        }
      }
    } catch (e) {
      // Do nothing, the user is not logged in
    }
  }
  next();
};
