import { select } from '@evershop/postgres-query-builder';
import Stripe from 'stripe';
import { pool } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import { OK, INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { getSetting } from '../../../setting/services/setting.js';
import {
  cartOwnsOrder,
  orderAmountInSmallestUnit
} from '../../services/bindStripePayment.js';

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
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
    const order = await select()
      .from('order')
      .where('uuid', '=', order_id)
      .load(pool);

    if (!order || !cartOwnsOrder(cart, order)) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid order'
        }
      });
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

    const stripe = new Stripe(stripeSecretKey);

    // Charge the order total, not a client-chosen cart that may not own it.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: orderAmountInSmallestUnit(order),
      currency: order.currency,
      metadata: {
        cart_id: cart.uuid,
        order_id: order.uuid
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
