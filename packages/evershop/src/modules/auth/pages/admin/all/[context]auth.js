import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';

export default async (request, response, next) => {
  // Asset-serving routes (adminStaticAsset) are exempt from session (see
  // bin/lib/routeNeedsSession.ts), so request.session is undefined there. No
  // session means no logged-in user to resolve — bail out cleanly instead of
  // destructuring undefined.
  if (!request.session) {
    next();
    return;
  }
  const { userID } = request.session;
  // Load the user from the database
  const user = await select()
    .from('admin_user')
    .where('admin_user_id', '=', userID)
    .and('status', '=', 1)
    .load(pool);

  if (!user) {
    // The user may not be logged in, or the account may be disabled
    // Logout the user
    request.logoutUser(() => {
      // Check if current route is adminLogin
      if (
        request.currentRoute.id === 'adminLogin' ||
        request.currentRoute.id === 'adminLoginJson'
      ) {
        next();
      } else {
        response.redirect(buildUrl('adminLogin'));
      }
    });
  } else {
    // Delete the password field
    delete user.password;
    request.locals.user = user;
    next();
  }
};
