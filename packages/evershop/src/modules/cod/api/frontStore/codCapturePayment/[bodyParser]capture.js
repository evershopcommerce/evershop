const { select, update, insert } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const { orderId } = request.body;

  // Validate the order;
  const order = await select()
    .from('order')
    .where('uuid', '=', orderId)
    .and('payment_method', '=', 'cod')
    .and('payment_status', '=', 'pending')
    .load(pool);

  if (!order) {
    response.json({
      data: {},
      success: false,
      message: 'Requested order does not exist or is not in pending payment status.'
    });
  } else {
    // Update order status to processing
    await update('order')
      .given({ payment_status: 'paid' })
      .where('uuid', '=', orderId)
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
    await insert('order_activity').given({
      order_activity_order_id: order.order_id,
      comment: `Customer paid using cash.`,
      customer_notified: 0 // TODO: check config of SendGrid
    }).execute(pool);

    response.json({
      success: true
    });
  }
};
