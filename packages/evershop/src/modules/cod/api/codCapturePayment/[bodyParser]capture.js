import { insert, select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import { INVALID_PAYLOAD, OK } from '../../../../lib/util/httpStatus.js';
import { updatePaymentStatus } from '../../../oms/services/updatePaymentStatus.js';

export default async (request, response, next) => {
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
    // Update order payment status
    await updatePaymentStatus(order.order_id, 'paid', pool);

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
