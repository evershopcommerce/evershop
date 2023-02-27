const { UNAUTHORIZED } = require('@evershop/evershop/src/lib/util/httpStatus');
const { getContextValue } = require('../../../graphql/services/contextHelper');

module.exports = (request, response, delegate, next) => {
  // Get the current route
  const { currentRoute } = request;
  // If the current route is public, continue to the next middleware
  // Missing access property means private
  if (currentRoute?.access === 'public') {
    next();
    return;
  }

  // Get the user from the context.
  const user = getContextValue(request, 'user');
  if (!user?.uuid) {
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
    let userRoles = user.roles;
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
