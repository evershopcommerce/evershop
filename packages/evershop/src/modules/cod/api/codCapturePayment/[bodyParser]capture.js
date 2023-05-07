const { select, update, insert } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  INVALID_PAYLOAD,
  OK
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  // eslint-disable-next-line camelcase
  const { order_id } = request.body;

  // Validate the order;
  const order = await select()
    .from('order')
    .where('uuid', '=', order_id)
    .and('payment_method', '=', 'cod')
    .and('payment_status', '=', 'pending')
    .load(pool);

  if (!order) {
    response.status(INVALID_PAYLOAD);
    response.json({
      error: {
        status: INVALID_PAYLOAD,
        message:
          'Requested order does not exist or is not in pending payment status'
      }
    });
  } else {
    // Update order status to processing
    await update('order')
      .given({ payment_status: 'paid' })
      .where('uuid', '=', order_id)
      .execute(pool);

    // Add transaction data to database
    await insert('payment_transaction')
      .given({
        payment_transaction_order_id: order.order_id,
        amount: order.grand_total,
        currency: order.currency,
        payment_action: 'capture',
        transaction_type: 'offline'
      })
      .execute(pool);

    // Save order activities
    await insert('order_activity')
      .given({
        order_activity_order_id: order.order_id,
        comment: 'Customer paid using cash.',
        customer_notified: 0 // TODO: check config of SendGrid
      })
      .execute(pool);

    response.status(OK);
    response.json({
      data: {}
    });
  }
};
