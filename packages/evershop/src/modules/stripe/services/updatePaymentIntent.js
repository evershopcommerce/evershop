/* eslint-disable no-useless-escape */
const stripePayment = require('stripe');
const smallestUnit = require('zero-decimal-currencies');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { error } = require('@evershop/evershop/src/lib/log/logger');
const { getSetting } = require('../../setting/services/setting');

module.exports = exports = {};

exports.updatePaymentIntent = async function updatePaymentIntent(order) {
  try {
    const { cart } = this;
    if (cart.getData('payment_method') !== 'stripe') {
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
    // Search the payment intent using metadata.cartId, make sure not to create a new one
    const paymentIntentSearch = await stripe.paymentIntents.search({
      limit: 1,
      query: `metadata[\"cart_id\"]:\"${cart.getData(
        'uuid'
      )}\" AND status:\"requires_payment_method\"`
    });
    if (paymentIntentSearch.data.length > 0) {
      // Update the payment intent with the latest amount
      await stripe.paymentIntents.update(paymentIntentSearch.data[0].id, {
        amount: smallestUnit.default(order.grand_total, order.currency),
        metadata: {
          orderId: order.uuid
        }
      });
    } else {
      throw new Error('Payment intent not found');
    }
  } catch (err) {
    error(err);
    // What if the payment intent is not found or we have an error while updating it?
    throw err;
  }
};
