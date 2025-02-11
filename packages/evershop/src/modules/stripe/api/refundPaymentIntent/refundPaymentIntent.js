const stripePayment = require('stripe');
const smallestUnit = require('zero-decimal-currencies');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const {
  OK,
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { error } = require('@evershop/evershop/src/lib/log/logger');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  select,
  getConnection,
  startTransaction,
  insert,
  commit,
  rollback
} = require('@evershop/postgres-query-builder');
const { getSetting } = require('../../../setting/services/setting');
const {
  updatePaymentStatus
} = require('../../../oms/services/updatePaymentStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const connection = await getConnection(pool);
  try {
    await startTransaction(connection);
    // eslint-disable-next-line camelcase
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
