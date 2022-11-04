const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const smallestUnit = require("zero-decimal-currencies");

const stripe = require('stripe')('sk_test_51Jdo9iEvEMCuLU1xZvrPhTSU4TsvSqRWyGorConYNrNFeSPxXdeJWZ5X1CNQ3dvruG56JvHIKOtD2D6oZGL0eHMR00cXfMu2hW');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const { body } = request;

  // Check the permission
  const order = await select().from('order').where('uuid', '=', body.orderId).load(pool);
  if (!order) {
    response.json({
      success: false,
      message: "The requested order does not exisst"
    });
  } else {
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
