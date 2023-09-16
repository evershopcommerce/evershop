const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const {
  translate
} = require('@evershop/evershop/src/lib/locale/translate/translate');
const {
  getContextValue,
  setContextValue
} = require('../../../../graphql/services/contextHelper');

module.exports = (request, response, delegate, next) => {
  // Check if the user is logged in
  const customerTokenPayload = getContextValue(request, 'customerTokenPayload');
  if (customerTokenPayload && customerTokenPayload.customer?.customerId) {
    // Redirect to admin dashboard
    response.redirect(buildUrl('homepage'));
  } else {
    setContextValue(request, 'pageInfo', {
      title: translate('Create an account'),
      description: translate('Create an account')
    });
    next();
  }
};
