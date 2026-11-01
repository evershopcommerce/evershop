import { debug } from '../../../lib/log/logger.js';
import { buildAbsoluteUrl } from '../../../lib/router/buildAbsoluteUrl.js';
import { signTrackingToken } from './anonymousTrackingToken.js';

/**
 * The link an order email gives the customer to open their order: the signed
 * tracking page (`orderTracking`), which works without signing in, or, when
 * ORDER_TRACKING_TOKEN_SECRET is not set, the order page in their account
 * (`orderView`, sign-in needed). Absolute, built from the routes, which the
 * event process loads at boot; the order and shipment emails used to write
 * both URLs by hand, each its own copy.
 */
export function getOrderEmailLink(orderUuid: string): string {
  let token: string | undefined;
  try {
    token = signTrackingToken(orderUuid);
  } catch {
    debug(
      'Anonymous tracking token secret is not configured — falling back to logged-in account URL.'
    );
  }
  return token
    ? buildAbsoluteUrl('orderTracking', { uuid: orderUuid }, { token })
    : buildAbsoluteUrl('orderView', { uuid: orderUuid });
}
