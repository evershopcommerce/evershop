import { UNAUTHORIZED } from '../../../../lib/util/httpStatus.js';

/**
 * This is the session based authentication middleware.
 * We do not implement session middleware on API routes, instead we only load the session from the database and set the user in the context.
 * @param {*} request
 * @param {*} response
 * @param {*} next
 * @returns
 */
export default async (request, response, next) => {
  // Get the current route
  const { currentRoute } = request;
  const currentAdminUser = request.getCurrentUser();
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
