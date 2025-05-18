const { translate } = require('../../../../../lib/locale/translate/translate');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const {
  setContextValue
} = require('../../../../graphql/services/contextHelper');

module.exports = (request, response, delegate, next) => {
  // Check if the customer is logged in
  if (!request.isCustomerLoggedIn()) {
    // Redirect to admin dashboard
    response.redirect(buildUrl('login'));
  } else {
    setContextValue(request, 'pageInfo', {
      title: translate('Account edit'),
      description: translate('Account edit')
    });
    next();
  }
};
