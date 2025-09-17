import { translate } from '../../../../../lib/locale/translate/translate.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request, response, next) => {
  // Check if the customer is logged in
  if (!request.isCustomerLoggedIn()) {
    // Redirect to admin dashboard
    response.redirect(buildUrl('login'));
  } else {
    setPageMetaInfo(request, {
      title: translate('Account details'),
      description: translate('Account details')
    });
    next();
  }
};
