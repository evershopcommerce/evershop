const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const smallestUnit = require("zero-decimal-currencies");
const { getSetting } = require('../../../../setting/services/setting');
const stripePayment = require('stripe');
const { getConfig } = require('../../../../../lib/util/getConfig');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const { body } = request;
  // Check the order
  const order = await select()
    .from('order')
    .where('uuid', '=', body.orderId)
    .load(pool);

  if (!order) {
    response.json({
      success: false,
      message: "The requested order does not exisst"
    });
  } else {
    const stripeConfig = getConfig('system.stripe', {});
    let stripeSecretKey;
    if (stripeConfig.secretKey) {
      stripeSecretKey = stripeConfig.secretKey;
    } else {
      stripeSecretKey = await getSetting('stripeSecretKey', '');
    }

    const stripe = stripePayment(stripeSecretKey);
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: smallestUnit.default(order.grand_total, order.currency),
      currency: order.currency,
      metadata: {
        orderId: body.orderId
      }
    });

    response.json({
      clientSecret: paymentIntent.client_secret,
      success: true
    });
  }
};
