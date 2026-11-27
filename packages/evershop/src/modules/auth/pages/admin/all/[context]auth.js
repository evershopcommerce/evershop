import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { getSafeRedirectPath } from '../../../../../lib/util/safeRedirect.js';

/**
 * The login page URL, with `?redirect=` set to the page the visitor asked
 * for, so a shared admin link opens that page once they log in.
 *
 * Only a GET page load can be repeated after login. The dashboard needs no
 * parameter (login goes there anyway), and returning to the logout route
 * would log the user out again.
 */
function buildLoginUrl(request) {
  const loginUrl = buildUrl('adminLogin');
  if (
    request.method !== 'GET' ||
    request.currentRoute.id === 'adminLogoutJson'
  ) {
    return loginUrl;
  }
  const adminRoot = buildUrl('dashboard');
  const target = getSafeRedirectPath(request.originalUrl, {
    prefix: adminRoot
  });
  if (!target || target === adminRoot) {
    return loginUrl;
  }
  return `${loginUrl}?redirect=${encodeURIComponent(target)}`;
}

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
        response.redirect(buildLoginUrl(request));
      }
    });
  } else {
    // Delete the password field
    delete user.password;
    request.locals.user = user;
    next();
  }
};
