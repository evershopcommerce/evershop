import { select } from '@evershop/postgres-query-builder';
import axios from 'axios';
import { emit } from '../../../../../lib/event/emitter.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { getContextValue } from '../../../../graphql/services/contextHelper.js';
import { getSetting } from '../../../../setting/services/setting.js';

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
  if (['paypal_captured', 'paypal_authorized'].includes(order.payment_status)) {
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
    // Call API using Axios to capture/authorize the payment
    const paymentIntent = await getSetting('paypalPaymentIntent', 'CAPTURE');
    const responseData = await axios.post(
      `${getContextValue(request, 'homeUrl')}${buildUrl(
        paymentIntent === 'CAPTURE'
          ? 'paypalCapturePayment'
          : 'paypalAuthorizePayment'
      )}`,
      {
        order_id
      },
      {
        headers: {
          'Content-Type': 'application/json',
          // Include all cookies from the current request
          Cookie: request.headers.cookie
        }
      }
    );
    if (responseData.data.error) {
      throw new Error(responseData.data.error.message);
    }
    // Re-load the order so subscribers see the post-capture payment status,
    // not the pending row loaded before the gateway call.
    const freshOrder = await select()
      .from('order')
      .where('order_id', '=', order.order_id)
      .load(pool);
    // Emit event to add order placed event
    await emit('order_placed', { ...(freshOrder ?? order) });
    // Redirect to order success page
    response.redirect(302, `${buildUrl('checkoutSuccess')}/${order_id}`);
  } catch (e) {
    next();
  }
};
