const { get } = require('../../../../../lib/util/get');
const { getContextValue } = require('../../../../graphql/services/contextHelper');

module.exports = (request, response, stack, next) => {
  // Get the token Payload
  const tokenPayLoad = getContextValue(request, 'tokenPayload');
  // If there is no token or is not admin, redirect to login page
  if (!tokenPayLoad || !get(tokenPayLoad, 'user.isAdmin')) {
    // Check if the current route is adminAuth
    if (request.currentRoute.id === 'adminAuth') {
      next();
    } else {
      // Response with 401 status code
      response.status(401);
      response.json({
        success: false,
        message: 'Unauthorized'
      })
    }
  } else {
    next();
  }
};
