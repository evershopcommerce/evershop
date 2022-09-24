const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { getContextValue } = require('../../../../graphql/services/buildContext');

const stripe = require('stripe')('sk_test_51Jdo9iEvEMCuLU1xZvrPhTSU4TsvSqRWyGorConYNrNFeSPxXdeJWZ5X1CNQ3dvruG56JvHIKOtD2D6oZGL0eHMR00cXfMu2hW');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const { sid } = getContextValue('tokenPayload', {});
  // Check the permission
  const order = await select().from('order').where('order_id', '=', request.body.orderId).and('sid', '=', sid).load(pool);
  if (!order) {
    response.json({
      success: false,
      message: "The requested order does not exisst"
    });
  } else {
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 10000,
      currency: 'usd',
      metadata: {
        orderId: request.body.orderId
      }
    });

    response.json({
      clientSecret: paymentIntent.client_secret,
      success: true
    });
  }
};
