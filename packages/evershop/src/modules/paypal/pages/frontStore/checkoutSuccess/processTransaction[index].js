const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { getContextValue } = require('../../../../graphql/services/contextHelper');
const { getSetting } = require('../../../../setting/services/setting');
const { default: axios } = require('axios');

module.exports = async (request, response, stack, next) => {
  // Get paypal token from query string
  const paypalToken = request.query.token;
  if (paypalToken) {
    const orderId = request.params.orderId;
    const query = select()
      .from('order');
    query.where('uuid', '=', orderId)
      .and('integration_order_id', '=', paypalToken)
      .and('payment_method', '=', 'paypal')
      .and('payment_status', '=', 'pending');

    const order = await query.load(pool);
    if (!order) {
      response.redirect(302, buildUrl('homepage'));
    } else {
      // Call API using Axios to capture/authorize the payment
      const paymentIntent = await getSetting('paypalPaymentIntent', 'CAPTURE');
      const response = await axios.post(`${getContextValue(request, 'homeUrl')}${buildUrl(paymentIntent === 'CAPTURE' ? 'paypalCapturePayment' : 'paypalAuthorizePayment')}`,
        {
          orderId: orderId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            // Include all cookies from the current request
            Cookie: request.headers.cookie
          },
        });
      console.log(response.data);
      next();
    }
  } else {
    next();
  }
};
