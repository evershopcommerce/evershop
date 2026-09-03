import {
  select,
  getConnection,
  startTransaction,
  commit,
  rollback
} from '@evershop/postgres-query-builder';
import Stripe from 'stripe';
import smallestUnit from 'zero-decimal-currencies';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import {
  OK,
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR
} from '../../../../lib/util/httpStatus.js';
import addOrderActivityLog from '../../../oms/services/addOrderActivityLog.js';
import { updatePaymentStatus } from '../../../oms/services/updatePaymentStatus.js';
import { getSetting } from '../../../setting/services/setting.js';

export default async (request, response, next) => {
  try {
    const { order_id, amount } = request.body;

    // Read-only validation on the shared pool, BEFORE acquiring a dedicated
    // connection. The old code opened a transaction first and returned early on
    // these guards without rolling back, leaking the pooled client every time.
    const order = await select()
      .from('order')
      .where('order_id', '=', order_id)
      .load(pool);
    if (!order || order.payment_method !== 'stripe') {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid order'
        }
      });
      return;
    }

    // Pick the latest transaction deterministically (an order can carry more
    // than one row — e.g. a re-payment). For a single Stripe PaymentIntent the
    // authorize and capture share the same transaction_id, so this is one row
    // in the common case. `.orderBy` lives on the query, not on the `Where`
    // node, so hold the handle and set the clauses on it separately.
    const paymentTransactionQuery = select()
      .from('payment_transaction')
      .orderBy('payment_transaction_id', 'DESC');
    paymentTransactionQuery.where(
      'payment_transaction_order_id',
      '=',
      order.order_id
    );
    const paymentTransaction = await paymentTransactionQuery.load(pool);
    if (!paymentTransaction) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Can not find payment transaction'
        }
      });
      return;
    }

    const stripeConfig = getConfig('system.stripe', {});
    const stripeSecretKey = stripeConfig?.secretKey
      ? stripeConfig.secretKey
      : await getSetting('stripeSecretKey', '');
    const stripe = new Stripe(stripeSecretKey);

    // Refund at Stripe first (a network call — kept out of the DB transaction).
    const refund = await stripe.refunds.create({
      payment_intent: paymentTransaction.transaction_id,
      amount: parseInt(smallestUnit(amount, order.currency), 10)
    });
    const chargeId =
      typeof refund.charge === 'string'
        ? refund.charge
        : refund.charge?.id ?? '';
    const charge = await stripe.charges.retrieve(chargeId);
    const status =
      charge.refunded === true ? 'stripe_refunded' : 'stripe_partial_refunded';

    // Short transaction for the DB writes only. getConnection immediately
    // followed by startTransaction — no pre-tx reads on this client.
    const connection = await getConnection(pool);
    try {
      await startTransaction(connection);
      await updatePaymentStatus(order.order_id, status, connection);
      await addOrderActivityLog(
        order.order_id,
        `Refunded ${amount} ${charge.currency}`,
        false,
        connection
      );
      await commit(connection);
    } catch (dbErr) {
      await rollback(connection);
      throw dbErr;
    }

    response.status(OK);
    response.json({
      data: {
        amount: refund.amount
      }
    });
  } catch (err) {
    error(err);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: err.message
      }
    });
  }
};
