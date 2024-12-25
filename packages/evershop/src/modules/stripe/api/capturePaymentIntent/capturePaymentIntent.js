const stripePayment = require('stripe');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const {
  OK,
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { error } = require('@evershop/evershop/src/lib/log/logger');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { select } = require('@evershop/postgres-query-builder');
const { getSetting } = require('../../../setting/services/setting');
const {
  updatePaymentStatus
} = require('../../../oms/services/updatePaymentStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  try {
    // eslint-disable-next-line camelcase
    const { order_id } = request.body;
    // Load the order
    const order = await select()
      .from('order')
      .where('uuid', '=', order_id)
      .load(pool);
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
      .load(pool);
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
    // Retrieve the PaymentIntent
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentTransaction.transaction_id
    );
    if (!paymentIntent) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid payment intent'
        }
      });
    }
    if (paymentIntent.status !== 'requires_capture') {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message:
            'Payment intent is not in the correct state (requires_capture)'
        }
      });
    }
    // Capture the PaymentIntent
    await stripe.paymentIntents.capture(paymentTransaction.transaction_id);
    // Update the order status to paid
    await updatePaymentStatus(order.order_id, 'paid');
    response.status(OK);
    response.json({
      data: {
        amount: paymentIntent.amount
      }
    });
  } catch (err) {
    error(err);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: 'Internal server error'
      }
    });
  }
};
