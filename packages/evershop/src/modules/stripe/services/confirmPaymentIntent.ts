import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import type Stripe from 'stripe';
import { error } from '../../../lib/log/logger.js';
import { getConnection } from '../../../lib/postgres/connection.js';
import {
  isPaymentIntentRecorded,
  recordStripeAuthorization,
  recordStripeCapture
} from './recordPaymentIntent.js';
import { paymentIntentMatchesOrder } from './stripeAmount.js';

export type PaymentIntentKind = 'capture' | 'authorization';

export type ConfirmPaymentIntentResult = 'recorded' | 'mismatch' | 'gone';

/**
 * How a PaymentIntent that holds the buyer's money is recorded: `succeeded`
 * is a capture, `requires_capture` an authorization. Any other status holds
 * no money (yet), so there is nothing to confirm.
 */
export function paymentIntentKind(status: string): PaymentIntentKind | null {
  if (status === 'succeeded') {
    return 'capture';
  }
  if (status === 'requires_capture') {
    return 'authorization';
  }
  return null;
}

/**
 * Confirms an order from a PaymentIntent that Stripe says is paid, outside the
 * webhook: the buyer's return to `/stripe/return`, and the abandoned order job.
 * Both are the fallback for a webhook that never arrives; the webhook stays
 * the source of truth for everything else (settling, failures, refunds).
 *
 * It does what the webhook does, in its own transaction: locks the order row
 * (`FOR UPDATE`), refuses an intent that does not match the order's amount and
 * currency (`paymentIntentMatchesOrder`, nothing is written), then records the
 * payment. The payment transaction is idempotent and the status change, the
 * activity log and `order_placed` happen only the first time, so whichever of
 * the webhook, the return page and the job gets there first does the work and
 * the others change nothing.
 *
 * The caller has checked that the intent is bound to the order
 * (`metadata.order_id`). Answers `gone` when the order is not a Stripe order
 * (or no longer exists), `mismatch` when the amount or currency differ.
 */
export async function confirmPaymentIntent(
  order: { order_id: number },
  intent: Stripe.PaymentIntent,
  kind: PaymentIntentKind
): Promise<ConfirmPaymentIntentResult> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const { rows } = await connection.query(
      'SELECT * FROM "order" WHERE "order_id" = $1 FOR UPDATE',
      [order.order_id]
    );
    const locked = rows[0];
    if (!locked || locked.payment_method !== 'stripe') {
      await commit(connection);
      return 'gone';
    }
    if (!paymentIntentMatchesOrder(locked, intent)) {
      error(
        new Error(
          `Stripe amount mismatch for order ${locked.order_id}: intent ${intent.id} charged ${intent.amount} ${intent.currency}, order expects ${locked.grand_total} ${locked.currency}. Not marking as paid.`
        )
      );
      await commit(connection);
      return 'mismatch';
    }
    const alreadyProcessed = await isPaymentIntentRecorded(
      connection,
      locked.order_id,
      intent.id
    );
    if (kind === 'capture') {
      await recordStripeCapture(connection, locked, intent, alreadyProcessed);
    } else {
      await recordStripeAuthorization(
        connection,
        locked,
        intent,
        alreadyProcessed
      );
    }
    await commit(connection);
    return 'recorded';
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}
