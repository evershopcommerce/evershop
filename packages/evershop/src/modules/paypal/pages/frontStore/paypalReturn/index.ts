import { select } from '@evershop/postgres-query-builder';
import { error } from '../../../../../lib/log/logger.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { finalizePaypalOrder } from '../../../services/finalizePaypalOrder.js';
import { createAxiosInstance } from '../../../services/requester.js';

const SETTLED_STATUSES = ['paypal_captured', 'paypal_authorized', 'paypal_pending'];

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  // Get paypal token from query string
  const paypalToken = request.query.token;
  if (!paypalToken) {
    // Redirect to homepage if no token
    response.redirect(302, buildUrl('homepage'));
    return;
  }
  const { order_id } = request.params;
  const order = await select()
    .from('order')
    .where('uuid', '=', order_id)
    .and('integration_order_id', '=', paypalToken)
    .and('payment_method', '=', 'paypal')
    .load(pool);

  if (!order) {
    response.redirect(302, buildUrl('homepage'));
    return;
  }
  if (SETTLED_STATUSES.includes(order.payment_status)) {
    // Refresh or revisit of the return URL after the payment already settled.
    // Send the customer to the order confirmation, not the homepage.
    response.redirect(302, `${buildUrl('checkoutSuccess')}/${order_id}`);
    return;
  }
  if (order.payment_status !== 'pending') {
    response.redirect(302, buildUrl('homepage'));
    return;
  }
  try {
    // Capture or authorize in-process. The previous HTTP call to the store's
    // own public URL died on anything sitting in front of it — proven live
    // with a Cloudflare bot challenge silently 403-ing the capture.
    const axiosInstance = await createAxiosInstance(request);
    await finalizePaypalOrder(order, axiosInstance);
    // Redirect to order success page
    response.redirect(302, `${buildUrl('checkoutSuccess')}/${order_id}`);
  } catch (e) {
    // Never swallow silently: an unlogged failure in the money path once cost
    // a full production diagnosis.
    error(e);
    next();
  }
};
