import { buildUrl } from '@evershop/evershop/src/lib/router/buildUrl.js';
import { translate } from '@evershop/evershop/src/lib/locale/translate/translate.js';
import {
  getContextValue,
  setContextValue
} from '../../../../graphql/services/contextHelper.js';

export default (request, response, delegate, next) => {
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
