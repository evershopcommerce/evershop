import {
  startTransaction,
  commit,
  rollback,
  insertOnUpdate,
  PoolClient
} from '@evershop/postgres-query-builder';
import stripePgk from 'stripe';
import { display } from 'zero-decimal-currencies';
import { emit } from '../../../../lib/event/emitter.js';
import { debug, error } from '../../../../lib/log/logger.js';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import addOrderActivityLog from '../../../oms/services/addOrderActivityLog.js';
import { recordRefund } from '../../../oms/services/recordRefund.js';
import { updatePaymentStatus } from '../../../oms/services/updatePaymentStatus.js';
import { getSetting } from '../../../setting/services/setting.js';
import { paymentIntentMatchesOrder } from '../../services/stripeAmount.js';
import { isHandledPaymentIntentEvent } from '../../services/webhookEvents.js';

/**
 * Load the order row with `FOR UPDATE` so it stays locked for the life of the
 * webhook transaction. Stripe can deliver the same event twice (a retry can
 * overlap a slow original); without the lock both deliveries read "no
 * transaction yet" and both emit `order_placed` — duplicate confirmation email
 * and duplicate side effects. The lock serializes them: the second delivery
 * blocks until the first commits, then sees the transaction row and stops.
 */
async function loadOrderByUuidForUpdate(
  connection: PoolClient,
  uuid: string | undefined
) {
  if (!uuid) {
    return undefined;
  }
  const { rows } = await connection.query(
    'SELECT * FROM "order" WHERE "uuid" = $1 FOR UPDATE',
    [uuid]
  );
  return rows[0];
}

async function loadOrderByPaymentIntentForUpdate(
  connection: PoolClient,
  paymentIntentId: string | undefined
) {
  if (!paymentIntentId) {
    return undefined;
  }
  const { rows } = await connection.query(
    `SELECT o.* FROM "order" o
       JOIN "payment_transaction" pt
         ON pt."payment_transaction_order_id" = o."order_id"
      WHERE pt."transaction_id" = $1
      FOR UPDATE OF o`,
    [paymentIntentId]
  );
  return rows[0];
}

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  const sig = request.headers['stripe-signature'];

  let event;
  const connection = await getConnection();
  try {
    const stripeConfig = getConfig('system.stripe', {}) as {
      secretKey?: string;
      endpointSecret?: string;
    };
    const stripeSecretKey = stripeConfig.secretKey
      ? stripeConfig.secretKey
      : await getSetting('stripeSecretKey', '');
    const stripe = new stripePgk(stripeSecretKey);

    // Webhook endpoint secret
    const endpointSecret = stripeConfig.endpointSecret
      ? stripeConfig.endpointSecret
      : await getSetting('stripeEndpointSecret', '');

    event = stripe.webhooks.constructEvent(
      request.body,
      sig as string,
      endpointSecret
    );

    await startTransaction(connection);

    // ---- Refund events (money-out, e.g. issued from the Stripe Dashboard) ----
    // EverShop-initiated refunds already set the status in their own request;
    // this reflects refunds made outside EverShop. Idempotent and consistent
    // with the admin flow: it only acts when the status actually changes.
    if (event.type === 'charge.refunded') {
      const charge = event.data.object as stripePgk.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;
      const order = await loadOrderByPaymentIntentForUpdate(
        connection,
        paymentIntentId
      );
      if (order && order.payment_method === 'stripe') {
        // Route through the shared recorder so a dashboard refund records a
        // transaction, sets the status, and emits `order_refunded` just like the
        // admin path. The individual refund's id is the idempotency key, so an
        // admin refund's webhook echo is a no-op.
        const latest = charge.refunds?.data?.[0];
        await recordRefund(
          {
            order,
            transactionId: latest?.id ?? charge.id,
            amount: parseFloat(
              display(
                latest?.amount ?? charge.amount_refunded,
                charge.currency
              )
            ),
            raw: charge
          },
          connection
        );
      }
      await commit(connection);
      response.json({ received: true });
      return;
    }

    // ---- PaymentIntent events (money-in) ----
    // Only the PaymentIntent lifecycle events below carry our order. Stripe also
    // delivers many sibling events (charge.*, refund.*, payout.*, …) whose object
    // is not our PaymentIntent and carries no order_id — acknowledge and ignore
    // them so Stripe does not retry events we never act on. (Same posture as the
    // PayPal webhook: unknown events answer 200.)
    if (!isHandledPaymentIntentEvent(event.type)) {
      debug(`Ignoring unhandled Stripe event type ${event.type}`);
      await commit(connection);
      response.json({ received: true });
      return;
    }

    const paymentIntent = event.data.object as stripePgk.PaymentIntent;
    const order = await loadOrderByUuidForUpdate(
      connection,
      paymentIntent.metadata?.order_id
    );
    if (!order) {
      // No local order to act on (missing/foreign metadata, or the order is
      // gone). Acknowledge so Stripe stops retrying — an unmappable event is
      // terminal, not transient.
      debug(
        `Stripe ${event.type}: no order for order_id ${paymentIntent.metadata?.order_id}, ignoring`
      );
      await commit(connection);
      response.json({ received: true });
      return;
    }

    // Reject any money-in intent that does not match this order in amount +
    // currency, or that is not a Stripe order. This is the server-side close of
    // the amount-integrity hole: the order owns the amount, the intent must
    // agree with it before we mark anything paid.
    const isMoneyInEvent =
      event.type === 'payment_intent.succeeded' ||
      event.type === 'payment_intent.amount_capturable_updated';
    if (isMoneyInEvent) {
      if (order.payment_method !== 'stripe') {
        debug(`Ignoring Stripe webhook for non-Stripe order ${order.order_id}`);
        await commit(connection);
        response.json({ received: true });
        return;
      }
      if (!paymentIntentMatchesOrder(order, paymentIntent)) {
        error(
          new Error(
            `Stripe amount mismatch for order ${order.order_id}: intent ${paymentIntent.id} charged ${paymentIntent.amount} ${paymentIntent.currency}, order expects ${order.grand_total} ${order.currency}. Not marking as paid.`
          )
        );
        // Acknowledge so Stripe stops retrying (a mismatch is terminal, not
        // transient); nothing is written, so the order is held at `pending` for
        // manual review rather than auto-fulfilled.
        await commit(connection);
        response.json({ received: true });
        return;
      }
    }

    // Whether this is the first time we process this intent, decided under the
    // row lock so concurrent deliveries cannot both see "not processed".
    const { rows: existingTxn } = await connection.query(
      'SELECT 1 FROM "payment_transaction" WHERE "transaction_id" = $1 AND "payment_transaction_order_id" = $2',
      [paymentIntent.id, order.order_id]
    );
    const alreadyProcessed = existingTxn.length > 0;

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        debug('payment_intent.succeeded event received');
        await insertOnUpdate('payment_transaction', [
          'transaction_id',
          'payment_transaction_order_id'
        ])
          .given({
            amount: parseFloat(
              display(paymentIntent.amount, paymentIntent.currency)
            ),
            payment_transaction_order_id: order.order_id,
            transaction_id: paymentIntent.id,
            transaction_type: 'online',
            payment_action:
              paymentIntent.capture_method === 'manual' ? 'Manual' : 'Automatic'
          })
          .execute(connection);

        if (!alreadyProcessed) {
          await updatePaymentStatus(
            order.order_id,
            'stripe_captured',
            connection
          );
          await addOrderActivityLog(
            order.order_id,
            `Payment captured by using Stripe. Transaction ID: ${paymentIntent.id}`,
            false,
            connection
          );
          // Emit on THIS connection so the event insert lives or dies with the
          // status update and only becomes visible to subscribers after commit.
          await emit(
            'order_placed',
            { ...order, payment_status: 'stripe_captured' },
            connection
          );
        }
        break;
      }
      case 'payment_intent.amount_capturable_updated': {
        debug('payment_intent.amount_capturable_updated event received');
        await insertOnUpdate('payment_transaction', [
          'transaction_id',
          'payment_transaction_order_id'
        ])
          .given({
            amount: parseFloat(
              display(paymentIntent.amount, paymentIntent.currency)
            ),
            payment_transaction_order_id: order.order_id,
            transaction_id: paymentIntent.id,
            transaction_type: 'online',
            payment_action:
              paymentIntent.capture_method === 'manual'
                ? 'authorize'
                : 'capture'
          })
          .execute(connection);

        if (!alreadyProcessed) {
          await updatePaymentStatus(
            order.order_id,
            'stripe_authorized',
            connection
          );
          await addOrderActivityLog(
            order.order_id,
            `Payment authorized by using Stripe. Transaction ID: ${paymentIntent.id}`,
            false,
            connection
          );
          await emit(
            'order_placed',
            { ...order, payment_status: 'stripe_authorized' },
            connection
          );
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        debug('payment_intent.payment_failed event received');
        // Delayed-notification methods (and any post-return failure) settle
        // here. Without this the order would sit at `pending` forever. Only
        // touch a still-pending order so a captured/authorized one is never
        // overridden by a late failure event.
        if (order.payment_status === 'pending') {
          await updatePaymentStatus(order.order_id, 'stripe_failed', connection);
          const reason =
            paymentIntent.last_payment_error?.message || 'Payment failed.';
          await addOrderActivityLog(
            order.order_id,
            `Stripe payment failed. ${reason} Transaction ID: ${paymentIntent.id}`,
            false,
            connection
          );
        }
        break;
      }
      case 'payment_intent.canceled': {
        debug('payment_intent.canceled event received');
        if (order.payment_status !== 'canceled') {
          await updatePaymentStatus(order.order_id, 'canceled', connection);
        }
        break;
      }
      default: {
        debug(`Unhandled event type ${event.type}`);
      }
    }
    await commit(connection);
    // Return a response to acknowledge receipt of the event
    response.json({ received: true });
  } catch (err) {
    error(err);
    await rollback(connection);
    response.status(400).send(`Webhook Error: ${err.message}`);
  }
};
