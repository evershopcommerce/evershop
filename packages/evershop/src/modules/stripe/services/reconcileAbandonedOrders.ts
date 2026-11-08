import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import Stripe from 'stripe';
import { debug, error, info } from '../../../lib/log/logger.js';
import { getConnection, pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { cancelAbandonedOrder } from '../../oms/services/cancelAbandonedOrder.js';
import { getSetting } from '../../setting/services/setting.js';
import {
  isPaymentIntentRecorded,
  recordStripeAuthorization,
  recordStripeCapture
} from './recordPaymentIntent.js';
import { paymentIntentMatchesOrder } from './stripeAmount.js';

/**
 * Stripe's side of abandoned orders, as PayPal's `reconcileAbandonedOrders`:
 * every Stripe order still unpaid an hour after it was created is checked
 * with Stripe, which alone knows whether the shopper gave up (a 3-D Secure
 * check left open sends no event, so such an order stayed `pending` forever)
 * or the money is on its way (a bank debit can be `processing` for days).
 *
 * For each order, the live state of every PaymentIntent made for it:
 * - one `succeeded` / `requires_capture`: the shopper paid and the webhook
 *   was lost; the payment is recorded and the order placed, as the webhook
 *   would have done;
 * - one `processing`, or a state this code does not know: wait;
 * - else (never finished, or canceled): each open intent is canceled at
 *   Stripe first, so it can never be paid later, then the order is canceled
 *   and its cart given back (`cancelAbandonedOrder`), so the shopper's cart
 *   recovery link works again.
 * Any error leaves the order as it is, for the next run.
 */

export const DEFAULT_ABANDONED_TTL_HOURS = 1;

/**
 * An order with no stored intent (made before the `stripe_payment_intent`
 * table, or its insert failed) can only be looked up with Stripe's search,
 * which "can be up to an hour behind during outages": such an order waits
 * until well past that.
 */
export const SEARCH_FALLBACK_MIN_AGE_HOURS = 6;

/** Orders looked at per run; the rest wait for the next one */
export const ORDERS_PER_RUN = 100;

const UNFINISHED = [
  'requires_payment_method',
  'requires_confirmation',
  'requires_action'
];

export interface IntentState {
  id: string;
  status: string;
}

export type StripeOrderDecision<T extends IntentState> =
  | { action: 'record'; intent: T; kind: 'capture' | 'authorization' }
  | { action: 'wait'; reason: string }
  | { action: 'cancel'; open: T[] };

/** What to do with an unpaid order, from its intents' live states */
export function decideAbandonedStripeOrder<T extends IntentState>(
  intents: T[]
): StripeOrderDecision<T> {
  const captured = intents.find((i) => i.status === 'succeeded');
  if (captured) {
    return { action: 'record', intent: captured, kind: 'capture' };
  }
  const authorized = intents.find((i) => i.status === 'requires_capture');
  if (authorized) {
    return { action: 'record', intent: authorized, kind: 'authorization' };
  }
  if (intents.some((i) => i.status === 'processing')) {
    return { action: 'wait', reason: 'a payment is processing' };
  }
  const unknown = intents.find(
    (i) => i.status !== 'canceled' && !UNFINISHED.includes(i.status)
  );
  if (unknown) {
    return { action: 'wait', reason: `unknown status ${unknown.status}` };
  }
  return {
    action: 'cancel',
    open: intents.filter((i) => i.status !== 'canceled')
  };
}

export interface UnpaidStripeOrder {
  order_id: number;
  uuid: string;
  created_at: Date | string;
}

export interface ReconcileDeps {
  storedIntentIds: (orderId: number) => Promise<string[]>;
  /** Stripe's search by the order's uuid (metadata); throws where search is not available (India) */
  searchIntentIds: (orderUuid: string) => Promise<string[]>;
  /** The intent's live state; null when this Stripe account does not know it (keys changed) */
  retrieve: (id: string) => Promise<Stripe.PaymentIntent | null>;
  cancelIntent: (id: string) => Promise<void>;
  record: (
    order: UnpaidStripeOrder,
    intent: Stripe.PaymentIntent,
    kind: 'capture' | 'authorization'
  ) => Promise<'recorded' | 'mismatch' | 'gone'>;
  cancelAbandonedOrder: (
    uuid: string,
    reason: string
  ) => Promise<{ cartReopened: boolean }>;
  now: () => number;
}

/** One unpaid Stripe order; answers what happened, for the log */
export async function reconcileStripeOrder(
  order: UnpaidStripeOrder,
  deps: ReconcileDeps
): Promise<string> {
  let ids = await deps.storedIntentIds(order.order_id);
  if (ids.length === 0) {
    const ageHours =
      (deps.now() - new Date(order.created_at).getTime()) / 3_600_000;
    if (ageHours < SEARCH_FALLBACK_MIN_AGE_HOURS) {
      return 'waiting (no stored payment intent; searched after 6 hours)';
    }
    try {
      ids = await deps.searchIntentIds(order.uuid);
    } catch (e) {
      return `waiting (Stripe search unavailable: ${(e as Error)?.message})`;
    }
  }
  const intents: Stripe.PaymentIntent[] = [];
  for (const id of ids) {
    const intent = await deps.retrieve(id);
    if (!intent) {
      // Another Stripe account (the keys were changed): nobody can tell
      return `waiting (payment intent ${id} unknown to this Stripe account)`;
    }
    intents.push(intent);
  }
  const decision = decideAbandonedStripeOrder(intents);
  if (decision.action === 'record') {
    const recorded = await deps.record(order, decision.intent, decision.kind);
    return recorded === 'recorded'
      ? `paid, the webhook was missed: ${decision.kind} recorded`
      : `paid at Stripe but not recorded (${recorded})`;
  }
  if (decision.action === 'wait') {
    return `waiting (${decision.reason})`;
  }
  for (const intent of decision.open) {
    // Throws when the intent moved on meanwhile (the shopper paid this very
    // moment): the order stays as it is, the next run sees the new state
    await deps.cancelIntent(intent.id);
  }
  const { cartReopened } = await deps.cancelAbandonedOrder(
    order.uuid,
    'Abandoned Stripe checkout: the payment was never completed'
  );
  return cartReopened ? 'canceled, cart given back' : 'canceled';
}

async function stripeClient(): Promise<Stripe | null> {
  const stripeConfig = (getConfig('system.stripe', {}) ?? {}) as {
    secretKey?: string;
  };
  const secretKey = stripeConfig.secretKey
    ? stripeConfig.secretKey
    : await getSetting('stripeSecretKey', '');
  return secretKey ? new Stripe(secretKey) : null;
}

/** The intents stored for an order (`stripe_payment_intent`), oldest first */
export async function storedIntentIds(orderId: number): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT payment_intent_id FROM stripe_payment_intent
      WHERE order_id = $1 ORDER BY stripe_payment_intent_id`,
    [orderId]
  );
  return rows.map((row) => row.payment_intent_id);
}

/** Records a lost webhook's payment under the order's row lock, as the webhook does */
export async function recordLostPayment(
  order: UnpaidStripeOrder,
  intent: Stripe.PaymentIntent,
  kind: 'capture' | 'authorization'
): Promise<'recorded' | 'mismatch' | 'gone'> {
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

function realDeps(stripe: Stripe): ReconcileDeps {
  return {
    storedIntentIds,
    searchIntentIds: async (orderUuid) => {
      const result = await stripe.paymentIntents.search({
        query: `metadata['order_id']:'${orderUuid.replace(/'/g, '')}'`,
        limit: 100
      });
      return result.data.map((intent) => intent.id);
    },
    retrieve: async (id) => {
      try {
        return await stripe.paymentIntents.retrieve(id);
      } catch (e) {
        if ((e as { code?: string })?.code === 'resource_missing') {
          return null;
        }
        throw e;
      }
    },
    cancelIntent: async (id) => {
      await stripe.paymentIntents.cancel(id, {
        cancellation_reason: 'abandoned'
      });
    },
    record: recordLostPayment,
    cancelAbandonedOrder,
    now: () => Date.now()
  };
}

/**
 * Stripe orders created before `cutoff` that were never paid nor canceled,
 * newest first: an order that keeps waiting (a bank debit, an intent of
 * another Stripe account) never holds back the newer ones
 */
export async function findUnpaidStripeOrders(
  cutoff: Date
): Promise<UnpaidStripeOrder[]> {
  const { rows } = await pool.query(
    `SELECT order_id, uuid, created_at FROM "order"
      WHERE payment_method = 'stripe'
        AND payment_status IN ('pending', 'stripe_failed')
        AND status <> 'canceled'
        AND placed_at IS NULL
        AND created_at < $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [cutoff, ORDERS_PER_RUN + 1]
  );
  return rows;
}

/**
 * The `stripeReconcileAbandonedOrders` cron job (every 15 minutes; config
 * `system.stripe.reconcileSchedule`, `reconcileEnabled`, and
 * `abandonedOrderTtlHours`, default 1). Per-order failures are logged and
 * retried on the next run.
 */
export default async function reconcileAbandonedStripeOrders(): Promise<void> {
  const stripeConfig = (getConfig('system.stripe', {}) ?? {}) as Record<
    string,
    unknown
  >;
  const ttlHours =
    parseFloat(String(stripeConfig.abandonedOrderTtlHours)) ||
    DEFAULT_ABANDONED_TTL_HOURS;
  const cutoff = new Date(Date.now() - ttlHours * 3_600_000);
  const orders = await findUnpaidStripeOrders(cutoff);
  if (orders.length === 0) {
    debug('Stripe reconciliation: no abandoned orders');
    return;
  }
  const stripe = await stripeClient();
  if (!stripe) {
    debug('Stripe reconciliation: no secret key, skipped');
    return;
  }
  if (orders.length > ORDERS_PER_RUN) {
    info(
      `Stripe reconciliation: more than ${ORDERS_PER_RUN} unpaid orders, the rest wait for the next run`
    );
  }
  const deps = realDeps(stripe);
  for (const order of orders.slice(0, ORDERS_PER_RUN)) {
    try {
      const outcome = await reconcileStripeOrder(order, deps);
      // A waiting order is checked again every run: only real changes are info
      (outcome.startsWith('waiting') ? debug : info)(
        `Stripe reconciliation: order ${order.uuid} ${outcome}`
      );
    } catch (e) {
      error(e);
    }
  }
}
