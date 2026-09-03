import { select, update } from '@evershop/postgres-query-builder';
import { NextFunction } from 'express';
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
import { resolveStripeReturnOutcome } from '../../../services/returnOutcome.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next: NextFunction
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

    if (!order || order.payment_method !== 'stripe') {
      response.redirect(buildUrl('homepage'));
      return;
    }

    const stripeConfig = getConfig('system.stripe', {});
    const stripeSecretKey = stripeConfig?.secretKey
      ? stripeConfig.secretKey
      : await getSetting('stripeSecretKey', '');
    const stripe = new Stripe(stripeSecretKey, {} as Stripe.StripeConfig);
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent);

    // Bind the intent to this order. The return URL is public and both query
    // params are attacker-controllable; without this check a foreign or
    // cheaper order's intent id could drive a redirect or a status change on
    // someone else's order. The metadata order_id is set server-side in
    // createPaymentIntent, so it is trustworthy.
    if (!paymentIntent || paymentIntent.metadata?.order_id !== order_id) {
      response.redirect(buildUrl('homepage'));
      return;
    }

    const outcome = resolveStripeReturnOutcome(paymentIntent.status);
    if (outcome === 'success' || outcome === 'pending') {
      // `pending` = a delayed-notification method still settling. The order is
      // real and the webhook finalizes it, so send the buyer to the order
      // page rather than marking it failed and reactivating the cart.
      response.redirect(buildUrl('checkoutSuccess', { orderId: order_id }));
      return;
    }

    // Genuine dead end: re-activate the cart so the buyer can retry.
    await update('cart')
      .given({ status: true })
      .where('cart_id', '=', order.cart_id)
      .execute(pool);
    // Only fail a still-pending order — the browser return can race a webhook
    // that already captured/authorized it, and that must not be clobbered.
    if (order.payment_status === 'pending') {
      await updatePaymentStatus(order.order_id, 'stripe_failed');
    }
    // Add an error notification
    addNotification(request, 'Payment failed', 'error');
    request.session.save(() => {
      // Redirect to the shopping cart
      response.redirect(buildUrl('cart'));
    });
  } catch (e) {
    error(e);
    response.redirect(buildUrl('homepage'));
  }
};
