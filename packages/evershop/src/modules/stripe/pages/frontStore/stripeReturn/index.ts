import { select, update } from '@evershop/postgres-query-builder';
import Stripe from 'stripe';
import { error } from '../../../../../lib/log/logger.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { getConfig } from '../../../../../lib/util/getConfig.js';
import { addNotification } from '../../../../../modules/base/services/notifications.js';
import { updatePaymentStatus } from '../../../../../modules/oms/services/updatePaymentStatus.js';
import { getSetting } from '../../../../../modules/setting/services/setting.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { EvershopResponse } from '../../../../../types/response.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  try {
    const { order_id, payment_intent } = request.query;
    if (typeof order_id !== 'string' || typeof payment_intent !== 'string') {
      response.redirect(buildUrl('homepage'));
      return;
    }
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
    if (stripeConfig?.secretKey) {
      stripeSecretKey = stripeConfig.secretKey;
    } else {
      stripeSecretKey = await getSetting('stripeSecretKey', '');
    }
    const stripePaymentMode = await getSetting('stripePaymentMode', 'capture');
    const stripe = new Stripe(stripeSecretKey, {} as Stripe.StripeConfig);
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
      await updatePaymentStatus(order.order_id, 'stripe_failed');
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
