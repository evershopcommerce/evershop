const { select } = require('@evershop/postgres-query-builder');
const stripePayment = require('stripe');
const smallestUnit = require('zero-decimal-currencies');
const { pool } = require('../../../../lib/postgres/connection');
const { getConfig } = require('../../../../lib/util/getConfig');
const { OK, INVALID_PAYLOAD } = require('../../../../lib/util/httpStatus');
const { getSetting } = require('../../../setting/services/setting');

module.exports = async (request, response, delegate, next) => {
  const { cart_id, order_id } = request.body;
  // Check the cart
  const cart = await select()
    .from('cart')
    .where('uuid', '=', cart_id)
    .load(pool);

  if (!cart) {
    response.status(INVALID_PAYLOAD);
    response.json({
      error: {
        status: INVALID_PAYLOAD,
        message: 'Invalid cart'
      }
    });
  } else {
    const stripeConfig = getConfig('system.stripe', {});
    let stripeSecretKey;

    if (stripeConfig.secretKey) {
      stripeSecretKey = stripeConfig.secretKey;
    } else {
      stripeSecretKey = await getSetting('stripeSecretKey', '');
    }
    const stripePaymentMode = await getSetting('stripePaymentMode', 'capture');

    const stripe = stripePayment(stripeSecretKey);

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: smallestUnit.default(cart.grand_total, cart.currency),
      currency: cart.currency,
      metadata: {
        cart_id,
        order_id
      },
      automatic_payment_methods: {
        enabled: true
      },
      capture_method:
        stripePaymentMode === 'capture' ? 'automatic_async' : 'manual'
    });

    response.status(OK);
    response.json({
      data: {
        clientSecret: paymentIntent.client_secret
      }
    });
  }
};
