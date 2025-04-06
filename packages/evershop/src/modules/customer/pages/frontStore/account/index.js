import { buildUrl } from '@evershop/evershop/src/lib/router/buildUrl.js';
import { translate } from '@evershop/evershop/src/lib/locale/translate/translate.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request, response, delegate, next) => {
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
