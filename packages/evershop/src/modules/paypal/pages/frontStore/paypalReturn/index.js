import { select } from '@evershop/postgres-query-builder';
import axios from 'axios';
import { emit } from '../../../../../lib/event/emitter.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { getContextValue } from '../../../../graphql/services/contextHelper.js';
import { getSetting } from '../../../../setting/services/setting.js';

export default async (request, response, next) => {
  // Get paypal token from query string
  const paypalToken = request.query.token;
  if (paypalToken) {
    const { order_id } = request.params;
    const query = select().from('order');
    query
      .where('uuid', '=', order_id)
      .and('integration_order_id', '=', paypalToken)
      .and('payment_method', '=', 'paypal')
      .and('payment_status', '=', 'pending');

    const order = await query.load(pool);
    if (!order) {
      response.redirect(302, buildUrl('homepage'));
    } else {
      try {
        // Call API using Axios to capture/authorize the payment
        const paymentIntent = await getSetting(
          'paypalPaymentIntent',
          'CAPTURE'
        );
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
        // Emit event to add order placed event
        await emit('order_placed', { ...order });
        // Redirect to order success page

        response.redirect(302, `${buildUrl('checkoutSuccess')}/${order_id}`);
      } catch (e) {
        next();
      }
    }
  } else {
    // Redirect to homepage if no token
    response.redirect(302, buildUrl('homepage'));
  }
};
