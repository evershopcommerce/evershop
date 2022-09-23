const stripe = require('stripe')('sk_test_51Jdo9iEvEMCuLU1xZvrPhTSU4TsvSqRWyGorConYNrNFeSPxXdeJWZ5X1CNQ3dvruG56JvHIKOtD2D6oZGL0eHMR00cXfMu2hW');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 10000,
    currency: 'usd',
    metadata: {
      orderId: request.session.orderId
    }
  });

  response.json({
    clientSecret: paymentIntent.client_secret
  });
};
