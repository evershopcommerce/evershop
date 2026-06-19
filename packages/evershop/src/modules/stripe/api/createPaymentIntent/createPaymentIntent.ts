import { select } from '@evershop/postgres-query-builder';
import Stripe from 'stripe';
import smallestUnit from 'zero-decimal-currencies';
import { pool } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import { OK, INVALID_PAYLOAD } from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { getSetting } from '../../../setting/services/setting.js';

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
    const stripeConfig = getConfig('system.stripe', {});
    let stripeSecretKey;

    if (stripeConfig?.secretKey) {
      stripeSecretKey = stripeConfig.secretKey;
    } else {
      stripeSecretKey = await getSetting('stripeSecretKey', '');
    }
    const stripePaymentMode = await getSetting('stripePaymentMode', 'capture');

    const stripe = new Stripe(stripeSecretKey);

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: parseInt(smallestUnit(cart.grand_total, cart.currency), 10),
      currency: cart.currency,
      metadata: {
        cart_id,
        order_id
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
