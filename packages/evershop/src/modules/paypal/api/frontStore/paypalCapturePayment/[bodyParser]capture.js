const { select, update, insert } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { default: axios } = require('axios');
const { getContextValue } = require('../../../../graphql/services/contextHelper');
const { getApiBaseUrl } = require('../../../services/getApiBaseUrl');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const { orderId } = request.body;

  // Validate the order;
  const order = await select()
    .from('order')
    .where('uuid', '=', orderId)
    .load(pool);

  if (!order) {
    response.json({
      data: {},
      success: false,
      message: 'Requested order does not exist'
    });
  } else {
    // Call API to authorize the paypal order using axios
    const responseData = await axios.post(
      `${(await getApiBaseUrl())}/v2/checkout/orders/` + order['integration_order_id'] + '/capture',
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getContextValue(request, 'paypalAccessToken')}`,
        }
      }
    );

    if (responseData.data.status === 'COMPLETED') {
      // Update order status to processing
      await update('order')
        .given({ payment_status: 'paid' })
        .where('uuid', '=', orderId)
        .execute(pool);

      // Add transaction data to database
      await insert('payment_transaction')
        .given({
          payment_transaction_order_id: order.order_id,
          transaction_id: responseData.data.purchase_units[0].payments.captures[0].id,
          amount: responseData.data.purchase_units[0].payments.captures[0].amount.value,
          currency: responseData.data.purchase_units[0].payments.captures[0].amount.currency_code,
          status: responseData.data.purchase_units[0].payments.captures[0].status,
          payment_action: 'capture',
          transaction_type: 'online',
          additional_information: JSON.stringify(responseData.data)
        })
        .execute(pool);

      // Save order activities
      await insert('order_activity').given({
        order_activity_order_id: order.order_id,
        comment: `Customer paid using PayPal. Transaction ID: ${responseData.data.purchase_units[0].payments.captures[0].id}`,
        customer_notified: 0 // TODO: check config of SendGrid
      }).execute(pool);

      response.json({
        success: true
      });
    } else {
      response.json({
        success: false,
        message: responseData.data.message
      });
    }
  }
};
