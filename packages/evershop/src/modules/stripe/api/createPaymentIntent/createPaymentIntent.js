const { select } = require('@evershop/postgres-query-builder');
const smallestUnit = require('zero-decimal-currencies');
const stripePayment = require('stripe');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const {
  OK,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { getSetting } = require('../../../setting/services/setting');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  // eslint-disable-next-line camelcase
  const { cart_id } = request.body;
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

    const stripe = stripePayment(stripeSecretKey);
    // Search the payment intent using metadata.cartId, make sure not to create a new one
    const paymentIntentSearch = await stripe.paymentIntents.search({
      limit: 1,
      // eslint-disable-next-line no-useless-escape
      query: `metadata[\"cart_id\"]:\"${cart_id}\" AND status:\"requires_payment_method\"`
    });

    if (paymentIntentSearch.data.length > 0) {
      response.status(OK);
      response.json({
        data: {
          clientSecret: paymentIntentSearch.data[0].client_secret
        }
      });
      return;
    }
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: smallestUnit.default(cart.grand_total, cart.currency),
      currency: cart.currency,
      metadata: {
        // eslint-disable-next-line camelcase
        cart_id
      },
      automatic_payment_methods: {
        enabled: true
      }
    });

    response.status(OK);
    response.json({
      data: {
        clientSecret: paymentIntent.client_secret
      }
    });
  }
};
