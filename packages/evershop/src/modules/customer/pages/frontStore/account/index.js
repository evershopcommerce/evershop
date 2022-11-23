const { buildUrl } = require("../../../../../lib/router/buildUrl");
const { getContextValue, setContextValue } = require("../../../../graphql/services/contextHelper");

module.exports = (request, response, stack, next) => {
  // Check if the user is logged in
  const tokenPayload = getContextValue(request, 'tokenPayload');
  if (!tokenPayload || !tokenPayload.user?.customerId) {
    // Redirect to admin dashboard
    response.redirect(buildUrl('homepage'));
  } else {
    setContextValue(request, 'pageInfo', {
      title: 'Account details',
      description: 'Account details'
    });
    next();
  }
}