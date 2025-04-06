import { buildUrl } from '@evershop/evershop/src/lib/router/buildUrl.js';
import { translate } from '@evershop/evershop/src/lib/locale/translate/translate.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request, response, delegate, next) => {
  // Check if the user is logged in
  if (request.isCustomerLoggedIn()) {
    // Redirect to homepage
    response.redirect(buildUrl('homepage'));
  } else {
    setContextValue(request, 'pageInfo', {
      title: translate('Login'),
      description: translate('Login')
    });
    next();
  }
};
