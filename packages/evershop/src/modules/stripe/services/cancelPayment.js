import { select } from '@evershop/postgres-query-builder';
import stripePayment from 'stripe';
import { error } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { getSetting } from '../../setting/services/setting.js';

export async function cancelPaymentIntent(orderID) {
  try {
    const transaction = await select()
      .from('payment_transaction')
      .where('payment_transaction_order_id', '=', orderID)
      .load(pool);
    if (!transaction) {
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

    // Get the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(
      transaction.transaction_id
    );
    if (!paymentIntent) {
      throw new Error('Can not find payment intent');
    }
    if (paymentIntent.status === 'canceled') {
      return;
    }
    await stripe.paymentIntents.cancel(transaction.transaction_id);
  } catch (err) {
    error(err);
    throw err;
  }
}
