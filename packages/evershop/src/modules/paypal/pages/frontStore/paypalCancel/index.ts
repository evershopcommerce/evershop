import { select, update } from '@evershop/postgres-query-builder';
import { error } from '../../../../../lib/log/logger.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { EvershopResponse } from '../../../../../types/response.js';
import cancelOrder from '../../../../oms/services/cancelOrder.js';
import { PAYPAL_METHOD_CODES } from '../../../services/paymentMethods.js';
import { createAxiosInstance } from '../../../services/requester.js';

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
      .and('payment_method', 'IN', PAYPAL_METHOD_CODES)
      .and('payment_status', '=', 'pending')
      .load(pool);
    if (order) {
      // A cancel can come after the buyer approved: the Venmo popup closed
      // late, a second click, a back button. Ask PayPal before cancelling an
      // order that may be paid; an approved or paid PayPal order goes to the
      // return page, which finalizes it.
      let paypalStatus: string | undefined;
      try {
        const axiosInstance = await createAxiosInstance(request);
        const { data } = await axiosInstance.get(
          `/v2/checkout/orders/${paypalToken}`
        );
        paypalStatus = data?.status;
      } catch (e) {
        // PayPal cannot tell: leave the order pending for the webhook and the
        // reconciliation cron rather than cancel a payment that went through.
        error(e);
        response.redirect(302, buildUrl('checkout'));
        return;
      }
      if (paypalStatus === 'APPROVED' || paypalStatus === 'COMPLETED') {
        response.redirect(
          302,
          `${buildUrl('paypalReturn', { order_id })}?token=${encodeURIComponent(
            String(paypalToken)
          )}`
        );
        return;
      }
      // Cancel the abandoned order first so its stock returns before the
      // re-activated cart can decrement it again on the retry checkout.
      let canceled = false;
      try {
        await cancelOrder(
          order.uuid,
          'Customer canceled the payment at PayPal'
        );
        canceled = true;
      } catch (e) {
        // The order stays pending for the reconciliation cron, and its cart
        // stays closed: re-opening it would take the same stock twice.
        error(e);
      }
      if (canceled) {
        await update('cart')
          .given({ status: 1 })
          .where('cart_id', '=', order.cart_id)
          .execute(pool);
      }
    }
  }
  // Redirect to the checkout page
  response.redirect(302, buildUrl('checkout'));
};
