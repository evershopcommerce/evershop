const { select } = require('@evershop/postgres-query-builder');
const { default: axios } = require('axios');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { emit } = require('@evershop/evershop/src/lib/event/emitter');
const { getContextValue } = require('../../../../../packages/evershop/src/modules/graphql/services/contextHelper');

module.exports = async (request, response, delegate, next) => {
  // Get paypal token from query string
  const {orderId} = request.params;
  const requestId = request.query.requestId;
  if (orderId && requestId) {
    // eslint-disable-next-line camelcase
    const query = select().from('order');
    query
      .where('uuid', '=', orderId)
      .and('integration_order_id', '=', requestId)
      .and('payment_method', '=', 'momo')
      .and('payment_status', '=', 'pending');

    const order = await query.load(pool);
    if (!order) {
      response.redirect(302, buildUrl('homepage'));
    } else {
      try {
        const responseData = await axios.post(
          `${getContextValue(request, 'homeUrl')}${buildUrl(
            'momoCapturePayment'
          )}`,
          {
            // eslint-disable-next-line camelcase
            orderId,
            requestId
          },
          {
            headers: {
              'Content-Type': 'application/json'
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
        response.redirect(302, `${buildUrl('checkoutSuccess')}/${orderId}`);
      } catch (e) {
        next();
      }
    }
  } else {
    // Redirect to homepage if no token
    response.redirect(302, buildUrl('homepage'));
  }
};
