import { insertOnUpdate, PoolClient } from '@evershop/postgres-query-builder';
import type Stripe from 'stripe';
import { display } from 'zero-decimal-currencies';
import addOrderActivityLog from '../../oms/services/addOrderActivityLog.js';
import { markOrderPlaced } from '../../oms/services/markOrderPlaced.js';
import { updatePaymentStatus } from '../../oms/services/updatePaymentStatus.js';

/**
 * Money in from a Stripe PaymentIntent, shared by the webhook
 * (`payment_intent.succeeded` / `amount_capturable_updated`) and the
 * abandoned order job (the fallback for a webhook that never arrived).
 *
 * The caller holds the order row locked (`FOR UPDATE`) in a transaction on
 * `connection`, and has checked that the intent belongs to this Stripe order
 * and matches its amount (`paymentIntentMatchesOrder`). Writes the payment
 * transaction (idempotent); the first time only, sets the status, logs, and
 * places the order (`markOrderPlaced`, on this connection, so `order_placed`
 * lives or dies with the status update).
 */
interface LockedOrder {
  order_id: number;
}

/** Whether this intent was recorded for this order already (decide under the row lock) */
export async function isPaymentIntentRecorded(
  connection: PoolClient,
  orderId: number,
  paymentIntentId: string
): Promise<boolean> {
  const { rows } = await connection.query(
    'SELECT 1 FROM "payment_transaction" WHERE "transaction_id" = $1 AND "payment_transaction_order_id" = $2',
    [paymentIntentId, orderId]
  );
  return rows.length > 0;
}

/** `succeeded`: the money is captured */
export async function recordStripeCapture(
  connection: PoolClient,
  order: LockedOrder,
  paymentIntent: Stripe.PaymentIntent,
  alreadyProcessed: boolean
): Promise<void> {
  await insertOnUpdate('payment_transaction', [
    'transaction_id',
    'payment_transaction_order_id'
  ])
    .given({
      amount: parseFloat(display(paymentIntent.amount, paymentIntent.currency)),
      payment_transaction_order_id: order.order_id,
      transaction_id: paymentIntent.id,
      transaction_type: 'online',
      payment_action:
        paymentIntent.capture_method === 'manual' ? 'Manual' : 'Automatic'
    })
    .execute(connection);

  if (!alreadyProcessed) {
    await updatePaymentStatus(order.order_id, 'stripe_captured', connection);
    await addOrderActivityLog(
      order.order_id,
      `Payment captured by using Stripe. Transaction ID: ${paymentIntent.id}`,
      false,
      connection
    );
    await markOrderPlaced(order.order_id, connection);
  }
}

/** `requires_capture`: the money is authorized, to capture later */
export async function recordStripeAuthorization(
  connection: PoolClient,
  order: LockedOrder,
  paymentIntent: Stripe.PaymentIntent,
  alreadyProcessed: boolean
): Promise<void> {
  await insertOnUpdate('payment_transaction', [
    'transaction_id',
    'payment_transaction_order_id'
  ])
    .given({
      amount: parseFloat(display(paymentIntent.amount, paymentIntent.currency)),
      payment_transaction_order_id: order.order_id,
      transaction_id: paymentIntent.id,
      transaction_type: 'online',
      payment_action:
        paymentIntent.capture_method === 'manual' ? 'authorize' : 'capture'
    })
    .execute(connection);

  if (!alreadyProcessed) {
    await updatePaymentStatus(order.order_id, 'stripe_authorized', connection);
    await addOrderActivityLog(
      order.order_id,
      `Payment authorized by using Stripe. Transaction ID: ${paymentIntent.id}`,
      false,
      connection
    );
    await markOrderPlaced(order.order_id, connection);
  }
}
