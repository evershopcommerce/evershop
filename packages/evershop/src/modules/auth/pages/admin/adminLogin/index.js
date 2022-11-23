const { getContextValue, setContextValue } = require("../../../../graphql/services/contextHelper");

module.exports = (request, response, stack, next) => {
  // Check if the user is logged in
  const tokenPayload = getContextValue(request, 'tokenPayload');
  if (tokenPayload && tokenPayload.isAdmin) {
    // Redirect to admin dashboard
    response.redirect(buildUrl('dashboard'));
  } else {
    setContextValue(request, 'pageInfo', {
      title: 'Admin Login',
      description: 'Admin Login'
    });
    next();
  }
}