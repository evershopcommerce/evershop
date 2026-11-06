import {
  commit,
  insertOnUpdate,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import type { AxiosInstance } from 'axios';
import { emit } from '../../../lib/event/emitter.js';
import { debug } from '../../../lib/log/logger.js';
import { getConnection, pool } from '../../../lib/postgres/connection.js';
import addOrderActivityLog from '../../oms/services/addOrderActivityLog.js';
import { updatePaymentStatus } from '../../oms/services/updatePaymentStatus.js';

/**
 * The buyer went through the PayPal flow but the payment was declined or
 * failed. Nothing was written locally; the order stays pending and the caller
 * decides what the buyer sees.
 */
export class PaypalPaymentDeclinedError extends Error {}

// A COMPLETED capture is settled money. A PENDING one (eCheck, manual review)
// is initiated but not settled — the order must not read as paid until the
// webhook/cron confirms it. Anything else is a failure.
export function mapCaptureStatus(status?: string): string | null {
  if (status === 'COMPLETED') {
    return 'paypal_captured';
  }
  if (status === 'PENDING') {
    return 'paypal_pending';
  }
  return null;
}

export function mapAuthorizationStatus(status?: string): string | null {
  if (status === 'CREATED') {
    return 'paypal_authorized';
  }
  if (status === 'PENDING') {
    return 'paypal_pending';
  }
  return null;
}

interface FinalizeResult {
  paymentStatus: string;
  transactionId: string;
  firstFinalization: boolean;
}

/**
 * Record one settled/pending PayPal payment against a local order: update the
 * payment status, insert the transaction idempotently, log activity, and emit
 * `order_placed` exactly once per transaction id — shared by the return page,
 * the webhook, and the reconciliation cron so every path uses the same guard.
 */
export async function recordPaypalPayment(
  order: any,
  payment: { id: string; amount?: { value?: string } },
  source: any,
  action: 'capture' | 'authorize',
  paymentStatus: string
): Promise<FinalizeResult> {
  const connection = await getConnection();
  await startTransaction(connection);
  let firstFinalization = false;
  try {
    const existing = await select()
      .from('payment_transaction')
      .where('transaction_id', '=', payment.id)
      .and('payment_transaction_order_id', '=', order.order_id)
      .load(connection);
    firstFinalization = !existing;

    await updatePaymentStatus(order.order_id, paymentStatus, connection);
    await insertOnUpdate('payment_transaction', [
      'transaction_id',
      'payment_transaction_order_id'
    ])
      .given({
        payment_transaction_order_id: order.order_id,
        transaction_id: payment.id,
        amount: parseFloat(payment.amount?.value ?? order.grand_total),
        payment_action: action,
        transaction_type: 'online',
        additional_information: JSON.stringify(source)
      })
      .execute(connection);

    if (firstFinalization) {
      await addOrderActivityLog(
        order.order_id,
        action === 'capture'
          ? `Captured the payment. Transaction ID: ${payment.id}`
          : `Customer authorized the payment using PayPal. Transaction ID: ${payment.id}`,
        false,
        connection
      );
    }
    await commit(connection);
  } catch (e) {
    await rollback(connection);
    throw e;
  }

  if (firstFinalization) {
    // After the commit so subscribers see the settled payment status, and
    // from a re-loaded row so the payload isn't the stale pending one.
    const freshOrder = await select()
      .from('order')
      .where('order_id', '=', order.order_id)
      .load(pool);
    await emit('order_placed', { ...(freshOrder ?? order) });
  } else {
    debug(
      `PayPal ${action} for order ${order.uuid} was already recorded; skipping order_placed`
    );
  }

  return { paymentStatus, transactionId: payment.id, firstFinalization };
}

interface FinalizeStrategy {
  action: 'capture' | 'authorize';
  endpoint: string;
  alreadyDoneIssue: string;
  extract: (data: any) => any;
  map: (status?: string) => string | null;
}

/**
 * Complete the payment for a local order whose PayPal order the buyer has
 * approved: capture or authorize (the PayPal order's own `intent` decides —
 * the admin setting can change between create and return), record the
 * transaction idempotently, update the payment status, and emit
 * `order_placed` exactly once across every caller (return page now, webhook
 * and reconciliation cron later).
 */
export async function finalizePaypalOrder(
  order: any,
  axiosInstance: AxiosInstance
): Promise<FinalizeResult> {
  // The GET is also the double-invoke guard: an already-COMPLETED PayPal
  // order (return-page refresh, crashed previous attempt after the PayPal
  // call succeeded) is finalized from its own payment object without calling
  // capture/authorize again.
  const { data: paypalOrder } = await axiosInstance.get(
    `/v2/checkout/orders/${order.integration_order_id}`
  );

  const strategy: FinalizeStrategy =
    paypalOrder.intent === 'AUTHORIZE'
      ? {
          action: 'authorize',
          endpoint: `/v2/checkout/orders/${order.integration_order_id}/authorize`,
          alreadyDoneIssue: 'ORDER_ALREADY_AUTHORIZED',
          extract: (data) =>
            data?.purchase_units?.[0]?.payments?.authorizations?.[0],
          map: mapAuthorizationStatus
        }
      : {
          action: 'capture',
          endpoint: `/v2/checkout/orders/${order.integration_order_id}/capture`,
          alreadyDoneIssue: 'ORDER_ALREADY_CAPTURED',
          extract: (data) => data?.purchase_units?.[0]?.payments?.captures?.[0],
          map: mapCaptureStatus
        };

  let source;
  if (paypalOrder.status === 'COMPLETED') {
    source = paypalOrder;
  } else {
    const response = await axiosInstance.post(
      strategy.endpoint,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `${order.uuid}-${strategy.action}`
        },
        validateStatus: (status) => status < 500
      }
    );
    if (response.status >= 400) {
      const issue = response.data?.details?.[0]?.issue;
      if (issue === strategy.alreadyDoneIssue) {
        // Lost the race against a concurrent finalization — read the result
        // it produced instead of failing the buyer.
        const retry = await axiosInstance.get(
          `/v2/checkout/orders/${order.integration_order_id}`
        );
        source = retry.data;
      } else {
        throw new Error(
          response.data?.message ||
            `PayPal ${strategy.action} failed with status ${response.status}`
        );
      }
    } else {
      source = response.data;
    }
  }

  const payment = strategy.extract(source);
  if (!payment) {
    throw new Error(
      `PayPal ${strategy.action} response carries no payment object`
    );
  }
  const paymentStatus = strategy.map(payment.status);
  if (!paymentStatus) {
    throw new PaypalPaymentDeclinedError(
      `PayPal ${strategy.action} was declined (payment status: ${payment.status})`
    );
  }

  return recordPaypalPayment(
    order,
    payment,
    source,
    strategy.action,
    paymentStatus
  );
}

/**
 * `finalizePaypalOrder` for callers with nobody left to show an error to
 * (webhook, reconciliation cron): a declined payment marks the order
 * `paypal_failed` for admin review instead of throwing. Everything else
 * still throws.
 */
export async function finalizePaypalOrderOrFail(
  order: any,
  axiosInstance: AxiosInstance
): Promise<FinalizeResult> {
  try {
    return await finalizePaypalOrder(order, axiosInstance);
  } catch (e) {
    if (e instanceof PaypalPaymentDeclinedError) {
      await updatePaymentStatus(order.order_id, 'paypal_failed');
      await addOrderActivityLog(
        order.order_id,
        `PayPal payment failed: ${e.message}`,
        false,
        pool as any
      );
      return {
        paymentStatus: 'paypal_failed',
        transactionId: '',
        firstFinalization: false
      };
    }
    throw e;
  }
}
