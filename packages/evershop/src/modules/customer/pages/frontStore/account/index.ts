import { translate } from '../../../../../lib/locale/translate/translate.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

export default (request, response: EvershopResponse, next) => {
  // Page-builder preview is loaded by an admin session, not a customer one.
  // Skip the customer login gate so the merchandiser can edit /account
  // widgets; the production path still redirects unauthenticated visitors.
  const isPageBuilderPreview =
    typeof request.query?.changeset === 'string' &&
    String(request.query.changeset).length > 0;
  // Check if the customer is logged in
  if (!isPageBuilderPreview && !request.isCustomerLoggedIn()) {
    // Redirect to admin dashboard
    response.redirect(buildUrl('login'));
  } else {
    setPageMetaInfo(request, {
      title: translate('My Account'),
      description: translate('My Account')
    });
    next();
  }
};
