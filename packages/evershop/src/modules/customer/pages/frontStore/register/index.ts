import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { translate } from '../../../../../lib/locale/translate/translate.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { getContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request, response, next) => {
  // Check if the user is logged in
  const customerTokenPayload = getContextValue(request, 'customerTokenPayload');
  if (customerTokenPayload && customerTokenPayload.customer?.customerId) {
    // Redirect to admin dashboard
    response.redirect(buildUrl('homepage'));
  } else {
    setPageMetaInfo(request, {
      title: translate('Create an account'),
      description: translate('Create an account')
    });
    next();
  }
};
