import { translate } from '../../../../../lib/locale/translate/translate.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

/**
 * Customer-only `/account/orders/:uuid` page. Gated on customer session. The
 * GraphQL `order(uuid: ...)` resolver enforces that the order belongs to the
 * current customer (storefront contract), so we don't need to re-check here —
 * an unauthed user is redirected, and a logged-in customer querying someone
 * else's order gets a `null` from GraphQL and renders an empty state.
 *
 * Stores the URL param as `orderUuid` context value so the page-component
 * query export can read it via `getContextValue("orderUuid")`.
 */
export default (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  if (!request.isCustomerLoggedIn()) {
    response.redirect(buildUrl('login'));
    return;
  }
  setContextValue(request, 'orderUuid', request.params.uuid);
  setPageMetaInfo(request, {
    title: translate('Order detail'),
    description: translate('Order detail')
  });
  next();
};
