const { select } = require('@evershop/postgres-query-builder');
const { default: axios } = require('axios');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { emit } = require('@evershop/evershop/src/lib/event/emitter');
const {
  getContextValue
} = require('../../../../graphql/services/contextHelper');
const { getSetting } = require('../../../../setting/services/setting');

module.exports = async (request, response, delegate, next) => {
  // Get paypal token from query string
  const paypalToken = request.query.token;
  if (paypalToken) {
    // eslint-disable-next-line camelcase
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
            // eslint-disable-next-line camelcase
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
        // eslint-disable-next-line camelcase
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
