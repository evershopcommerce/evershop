import { select, update } from '@evershop/postgres-query-builder';
import { error } from '../../../../../lib/log/logger.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { EvershopResponse } from '../../../../../types/response.js';
import cancelOrder from '../../../../oms/services/cancelOrder.js';

// The third parameter matters even though it is never called: a 2-arg page
// middleware is treated as passive and auto-next()s after the redirect,
// running the whole SSR pipeline against an already-sent response.
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  // When the user cancelled the payment from PayPal
  // he/she will be redirected to the checkout page.
  // We need to check if the cart is still valid.
  // Get the paypal token from query string
  const paypalToken = request.query.token;

  const { order_id } = request.params;
  if (paypalToken) {
    // This token actually the paypal order id
    const order = await select()
      .from('order')
      .where('integration_order_id', '=', paypalToken)
      .and('uuid', '=', order_id)
      .and('payment_method', '=', 'paypal')
      .and('payment_status', '=', 'pending')
      .load(pool);
    if (order) {
      // Cancel the abandoned order first so its stock returns before the
      // re-activated cart can decrement it again on the retry checkout.
      try {
        await cancelOrder(order.uuid, 'Customer canceled the payment at PayPal');
      } catch (e) {
        // The buyer still gets their cart back; the pending order is then
        // picked up by the reconciliation cron.
        error(e);
      }
      // We re-activate the cart
      await update('cart')
        .given({ status: 1 })
        .where('cart_id', '=', order.cart_id)
        .execute(pool);
    }
  }
  // Redirect to the checkout page
  response.redirect(302, buildUrl('checkout'));
};
