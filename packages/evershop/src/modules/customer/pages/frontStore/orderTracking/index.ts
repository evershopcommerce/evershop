import { translate } from '../../../../../lib/locale/translate/translate.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { verifyTrackingToken } from '../../../../oms/services/anonymousTrackingToken.js';

/**
 * Public anonymous tracking page. The link in lifecycle emails carries a TTL'd
 * HMAC-signed JWT (see `oms/services/anonymousTrackingToken.ts`). This handler:
 *
 *   - Reads `?token=…` from the query string.
 *   - Verifies the token. On success, exposes the order UUID embedded in the
 *     token (NOT `request.params.uuid`) to the GraphQL context, so a customer
 *     can't paste a different UUID into the URL and view someone else's order.
 *   - On expired/invalid token, exposes a status code (`expired`, `invalid`,
 *     `no_secret`, `mismatch`) to the context so the page renders a friendly
 *     "this link is no longer valid" state with a CTA to the logged-in
 *     `/account/orders` page.
 *
 * The path param `:uuid` is informational only — if it disagrees with the
 * token's embedded UUID, we treat the request as tampered and render the
 * invalid state.
 */
export default (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  const token = typeof request.query.token === 'string' ? request.query.token : '';
  const pathUuid = request.params.uuid;

  if (!token) {
    setContextValue(request, 'trackingStatus', 'invalid');
    setContextValue(request, 'orderUuid', null);
    setPageMetaInfo(request, {
      title: translate('Tracking link'),
      description: translate('Tracking link')
    });
    next();
    return;
  }

  const result = verifyTrackingToken(token);
  if (!result.ok) {
    setContextValue(request, 'trackingStatus', result.reason);
    setContextValue(request, 'orderUuid', null);
    setPageMetaInfo(request, {
      title: translate('Tracking link'),
      description: translate('Tracking link')
    });
    next();
    return;
  }

  if (result.orderUuid !== pathUuid) {
    setContextValue(request, 'trackingStatus', 'mismatch');
    setContextValue(request, 'orderUuid', null);
    setPageMetaInfo(request, {
      title: translate('Tracking link'),
      description: translate('Tracking link')
    });
    next();
    return;
  }

  setContextValue(request, 'trackingStatus', 'ok');
  setContextValue(request, 'orderUuid', result.orderUuid);
  setPageMetaInfo(request, {
    title: translate('Track your order'),
    description: translate('Track your order')
  });
  next();
};
