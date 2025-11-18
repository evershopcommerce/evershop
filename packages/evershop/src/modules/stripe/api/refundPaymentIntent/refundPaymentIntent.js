import {
  select,
  getConnection,
  startTransaction,
  insert,
  commit,
  rollback
} from '@evershop/postgres-query-builder';
import stripePayment from 'stripe';
import smallestUnit from 'zero-decimal-currencies';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import {
  OK,
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR
} from '../../../../lib/util/httpStatus.js';
import { updatePaymentStatus } from '../../../oms/services/updatePaymentStatus.js';
import { getSetting } from '../../../setting/services/setting.js';

export default async (request, response, next) => {
  const connection = await getConnection(pool);
  try {
    await startTransaction(connection);

    const { order_id, amount } = request.body;
    // Load the order
    const order = await select()
      .from('order')
      .where('order_id', '=', order_id)
      .load(connection);
    if (!order || order.payment_method !== 'stripe') {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid order'
        }
      });
      return;
    }

    // Get the payment transaction
    const paymentTransaction = await select()
      .from('payment_transaction')
      .where('payment_transaction_order_id', '=', order.order_id)
      .load(connection);
    if (!paymentTransaction) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Can not find payment transaction'
        }
      });
      return;
    }

    const stripeConfig = getConfig('system.stripe', {});
    let stripeSecretKey;

    if (stripeConfig.secretKey) {
      stripeSecretKey = stripeConfig.secretKey;
    } else {
      stripeSecretKey = await getSetting('stripeSecretKey', '');
    }
    const stripe = stripePayment(stripeSecretKey);
    // Refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentTransaction.transaction_id,
      amount: smallestUnit.default(amount, order.currency)
    });
    const charge = await stripe.charges.retrieve(refund.charge);
    // Update the order status
    const status = charge.refunded === true ? 'refunded' : 'partial_refunded';
    await updatePaymentStatus(order.order_id, status, connection);
    await insert('order_activity')
      .given({
        order_activity_order_id: order.order_id,
        comment: `Refunded ${amount} ${charge.currency}`
      })
      .execute(connection);
    await commit(connection);
    response.status(OK);
    response.json({
      data: {
        amount: refund.amount
      }
    });
  } catch (err) {
    error(err);
    await rollback(connection);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: err.message
      }
    });
  }
};
