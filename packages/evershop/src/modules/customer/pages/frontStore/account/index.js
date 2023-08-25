const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const {
  setContextValue
} = require('../../../../graphql/services/contextHelper');
const {
  translate
} = require('@evershop/evershop/src/lib/locale/translate/translate');

module.exports = (request, response, delegate, next) => {
  // Check if the customer is logged in
  if (!request.isCustomerLoggedIn()) {
    // Redirect to admin dashboard
    response.redirect(buildUrl('login'));
  } else {
    setContextValue(request, 'pageInfo', {
      title: translate('Account details'),
      description: translate('Account details')
    });
    next();
  }
};
