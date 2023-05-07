const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const {
  getContextValue,
  setContextValue
} = require('../../../../graphql/services/contextHelper');

module.exports = (request, response, delegate, next) => {
  // Check if the user is logged in
  const userTokenPayload = getContextValue(request, 'userTokenPayload');
  if (userTokenPayload && userTokenPayload?.user?.uuid) {
    // Redirect to admin dashboard
    response.redirect(buildUrl('dashboard'));
  } else {
    setContextValue(request, 'pageInfo', {
      title: 'Admin Login',
      description: 'Admin Login'
    });
    next();
  }
};
