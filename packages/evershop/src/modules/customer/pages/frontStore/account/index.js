const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { getContextValue, setContextValue } = require('../../../../graphql/services/contextHelper');

module.exports = (request, response, delegate, next) => {
  // Check if the user is logged in
  const customerTokenPayload = getContextValue(request, 'customerTokenPayload');
  if (!customerTokenPayload || !customerTokenPayload.customer?.customerId) {
    // Redirect to admin dashboard
    response.redirect(buildUrl('homepage'));
  } else {
    setContextValue(request, 'pageInfo', {
      title: 'Account details',
      description: 'Account details'
    });
    next();
  }
};
