const stripePayment = require('stripe');
const { select, update } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const {
  getSetting
} = require('@evershop/evershop/src/modules/setting/services/setting');
const {
  addNotification
} = require('@evershop/evershop/src/modules/base/services/notifications');
const { error } = require('@evershop/evershop/src/lib/log/logger');
const {
  updatePaymentStatus
} = require('@evershop/evershop/src/modules/oms/services/updatePaymentStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  try {
    const { order_id, payment_intent } = request.query;
    // Check if order exist
    const order = await select()
      .from('order')
      .where('uuid', '=', order_id)
      .load(pool);

    if (!order) {
      // Redirect to the home page
      response.redirect(buildUrl('homepage'));
      return;
    }

    const stripeConfig = getConfig('system.stripe', {});
    let stripeSecretKey;
    if (stripeConfig.secretKey) {
      stripeSecretKey = stripeConfig.secretKey;
    } else {
      stripeSecretKey = await getSetting('stripeSecretKey', '');
    }
    const stripePaymentMode = await getSetting('stripePaymentMode', 'capture');
    const stripe = stripePayment(stripeSecretKey);
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent);
    // Check if the payment intent is succeeded
    if (
      (stripePaymentMode === 'capture' &&
        paymentIntent.status === 'succeeded') ||
      (stripePaymentMode === 'authorizeOnly' &&
        paymentIntent.status === 'requires_capture')
    ) {
      // Redirect to the order success page
      response.redirect(buildUrl('checkoutSuccess', { orderId: order_id }));
      return;
    } else {
      // Redirect back to the shopping cart
      // Active the cart
      await update('cart')
        .given({ status: true })
        .where('cart_id', '=', order.cart_id)
        .execute(pool);
      await updatePaymentStatus(order.order_id, 'failed');
      // Add a error notification
      addNotification(request, 'Payment failed', 'error');
      request.session.save(() => {
        // Redirect to the shopping cart
        response.redirect(buildUrl('cart'));
      });
      return;
    }
  } catch (e) {
    error(e);
    response.redirect(buildUrl('homepage'));
    return;
  }
};
