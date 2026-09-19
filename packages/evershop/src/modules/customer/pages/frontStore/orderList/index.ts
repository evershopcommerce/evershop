import { translate } from '../../../../../lib/locale/translate/translate.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

/**
 * Customer-only `/account/orders` page — gated on customer session. Lists
 * every order the customer has placed, in descending date order. Links each
 * row to `/account/orders/:uuid` for the detail page (B1).
 */
export default (request, response: EvershopResponse, next) => {
  if (!request.isCustomerLoggedIn()) {
    response.redirect(buildUrl('login'));
    return;
  }
  setPageMetaInfo(request, {
    title: translate('Your Orders'),
    description: translate('All your past orders')
  });
  next();
};
