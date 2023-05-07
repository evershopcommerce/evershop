const {
  getContextValue,
  setContextValue
} = require('../../../../graphql/services/contextHelper');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { get } = require('@evershop/evershop/src/lib/util/get');

module.exports = (request, response, delegate, next) => {
  // Get the token Payload
  const tokenPayLoad = getContextValue(request, 'userTokenPayload');
  // If there is no token or is not admin, redirect to login page
  if (!tokenPayLoad || !get(tokenPayLoad, 'user.isAdmin')) {
    // Check if current route is adminLogin
    if (request.currentRoute.id === 'adminLogin') {
      next();
    } else {
      response.redirect(buildUrl('adminLogin'));
    }
  } else {
    setContextValue(
      request,
      'userId',
      parseInt(tokenPayLoad.user.adminUserId, 10)
    );
    next();
  }
};
