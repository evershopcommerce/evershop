import util from 'util';
import { select } from '@evershop/postgres-query-builder';
import sessionStorage from 'connect-pg-simple';
import session from 'express-session';
import { pool } from '../../../../lib/postgres/connection.js';
import { setContextValue } from '../../../graphql/services/contextHelper.js';
import { getAdminSessionCookieName } from '../../services/getAdminSessionCookieName.js';

/**
 * This is the session based authentication middleware.
 * We do not implement session middleware on API routes, instead we only load the session from the database and set the user in the context.
 * @param {*} request
 * @param {*} response
 * @param {*} next
 * @returns
 */
export default async (request, response, next) => {
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
