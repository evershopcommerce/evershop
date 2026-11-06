import {
  commit,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import type { AxiosInstance } from 'axios';
import { debug, error, info } from '../../../lib/log/logger.js';
import { getConnection, pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import addOrderActivityLog from '../../oms/services/addOrderActivityLog.js';
import cancelOrder from '../../oms/services/cancelOrder.js';
import { updatePaymentStatus } from '../../oms/services/updatePaymentStatus.js';
import {
  finalizePaypalOrderOrFail,
  recordPaypalPayment
} from './finalizePaypalOrder.js';
import { PAYPAL_METHOD_CODES } from './paymentMethods.js';
import { createStandaloneAxiosInstance } from './requester.js';

export const DEFAULT_ABANDONED_TTL_HOURS = 6;
export const DEFAULT_PENDING_PAYMENT_TTL_DAYS = 14;

async function reconcileOrder(order): Promise<string> {
  if (!order.integration_order_id) {
    // The buyer never even reached PayPal — no PayPal order was created.
    await cancelOrder(
      order.uuid,
      'Abandoned PayPal checkout: the payment was never started'
    );
    return 'canceled';
  }
  const axiosInstance = await createStandaloneAxiosInstance();
  const response = await axiosInstance.get(
    `/v2/checkout/orders/${order.integration_order_id}`,
    { validateStatus: (status) => status < 500 }
  );
  if (response.status === 404) {
    await cancelOrder(
      order.uuid,
      'Abandoned PayPal checkout: the PayPal order no longer exists'
    );
    return 'canceled';
  }
  if (response.status >= 400) {
    throw new Error(
      `PayPal order lookup failed for ${order.uuid}: ${
        response.data?.message || response.status
      }`
    );
  }
  const paypalStatus = response.data.status;
  if (paypalStatus === 'APPROVED' || paypalStatus === 'COMPLETED') {
    // The buyer paid (or approved and never returned) but the return leg was
    // lost — finish the payment instead of throwing the money away. This is
    // also the fallback for missed webhooks.
    const result = await finalizePaypalOrderOrFail(order, axiosInstance);
    return result.paymentStatus;
  }
  // CREATED / SAVED / VOIDED / PAYER_ACTION_REQUIRED — the buyer never
  // approved and the approve link is long expired.
  await cancelOrder(
    order.uuid,
    'Abandoned PayPal checkout: the buyer never approved the payment'
  );
  return 'canceled';
}

/**
 * Mark a `paypal_pending` order `paypal_failed` (cancelable, for admin
 * review), only while it is still `paypal_pending`: a webhook that settled it
 * meanwhile wins.
 */
async function failPendingPayment(order, message: string): Promise<boolean> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const { rows } = await connection.query(
      'SELECT "payment_status" FROM "order" WHERE "order_id" = $1 FOR UPDATE',
      [order.order_id]
    );
    if (rows[0]?.payment_status !== 'paypal_pending') {
      await rollback(connection);
      return false;
    }
    await updatePaymentStatus(order.order_id, 'paypal_failed', connection);
    await addOrderActivityLog(order.order_id, message, false, connection);
    await commit(connection);
    return true;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Read a held (`paypal_pending`) payment back from PayPal and move the order
 * on. The webhook does this for a capture (PAYMENT.CAPTURE.COMPLETED /
 * DENIED); this is the fallback when it is lost or not configured, and the
 * only path for a held authorization, which has no webhook here.
 * - capture COMPLETED → paypal_captured; DECLINED / FAILED → paypal_failed
 * - authorization CREATED → paypal_authorized (capturable, voidable);
 *   CAPTURED in the PayPal account → paypal_captured from its capture;
 *   DENIED / VOIDED / EXPIRED → paypal_failed
 * - still held past `ttlDays` → paypal_failed, for a person to check in PayPal
 * `order_placed` was emitted when the payment was first recorded and is not
 * emitted again (recordPaypalPayment only emits it for a new transaction).
 * Returns the order's payment status after the call.
 */
export async function settlePendingPayment(
  order,
  axiosInstance: AxiosInstance,
  ttlDays: number = DEFAULT_PENDING_PAYMENT_TTL_DAYS
): Promise<string> {
  // .orderBy() lives on the query, not on the Node .where() returns
  const query = select()
    .from('payment_transaction')
    .orderBy('payment_transaction_id', 'DESC');
  query.where('payment_transaction_order_id', '=', order.order_id);
  const held = await query.load(pool);
  if (!held?.transaction_id) {
    error(
      new Error(
        `PayPal reconciliation: order ${order.uuid} is paypal_pending with no payment recorded`
      )
    );
    return order.payment_status;
  }
  const id = held.transaction_id;
  if (held.payment_action === 'authorize') {
    const { data: authorization } = await axiosInstance.get(
      `/v2/payments/authorizations/${id}`
    );
    if (authorization.status === 'CREATED') {
      await recordPaypalPayment(
        order,
        authorization,
        authorization,
        'authorize',
        'paypal_authorized'
      );
      return 'paypal_authorized';
    }
    if (['CAPTURED', 'PARTIALLY_CAPTURED'].includes(authorization.status)) {
      // Captured in the PayPal account: record its capture once it is money.
      const { data: paypalOrder } = await axiosInstance.get(
        `/v2/checkout/orders/${order.integration_order_id}`
      );
      const capture = (
        paypalOrder.purchase_units?.[0]?.payments?.captures ?? []
      ).find((c) => c.status === 'COMPLETED');
      if (capture) {
        await recordPaypalPayment(
          order,
          capture,
          paypalOrder,
          'capture',
          'paypal_captured'
        );
        return 'paypal_captured';
      }
    }
    if (['DENIED', 'VOIDED', 'EXPIRED'].includes(authorization.status)) {
      await failPendingPayment(
        order,
        `PayPal ${authorization.status.toLowerCase()} the held authorization ${id}.`
      );
      return 'paypal_failed';
    }
  } else {
    const { data: capture } = await axiosInstance.get(
      `/v2/payments/captures/${id}`
    );
    if (capture.status === 'COMPLETED') {
      await recordPaypalPayment(
        order,
        capture,
        capture,
        'capture',
        'paypal_captured'
      );
      return 'paypal_captured';
    }
    if (capture.status === 'DECLINED' || capture.status === 'FAILED') {
      await failPendingPayment(
        order,
        `PayPal ${capture.status.toLowerCase()} the held capture ${id}.`
      );
      return 'paypal_failed';
    }
  }
  const staleBefore = Date.now() - ttlDays * 24 * 3600 * 1000;
  if (new Date(order.created_at).getTime() < staleBefore) {
    await failPendingPayment(
      order,
      `PayPal still holds ${held.payment_action} ${id} after ${ttlDays} days. Check it in the PayPal account before canceling the order: if PayPal completes it later, the PAYMENT.CAPTURE.COMPLETED webhook records it again.`
    );
    return 'paypal_failed';
  }
  return 'paypal_pending';
}

/**
 * Settle every PayPal (and Venmo) order whose payment PayPal holds
 * (`paypal_pending`), whatever its age. Per-order failures are logged and
 * retried on the next run.
 */
export async function settlePendingPaypalPayments(
  getAxios: () => Promise<AxiosInstance>,
  ttlDays: number = DEFAULT_PENDING_PAYMENT_TTL_DAYS
): Promise<void> {
  const orders = await select()
    .from('order')
    .where('payment_method', 'IN', PAYPAL_METHOD_CODES)
    .and('payment_status', '=', 'paypal_pending')
    .execute(pool);
  if (orders.length === 0) {
    return;
  }
  const axiosInstance = await getAxios();
  for (const order of orders) {
    try {
      const outcome = await settlePendingPayment(order, axiosInstance, ttlDays);
      if (outcome !== 'paypal_pending') {
        info(
          `PayPal reconciliation: held payment of order ${order.uuid} resolved to ${outcome}`
        );
      }
    } catch (e) {
      error(e);
    }
  }
}

/**
 * Runs every 30 minutes:
 * - settles `paypal_pending` orders (see settlePendingPayment);
 * - resolves every PayPal order still `pending` past the abandonment TTL:
 *   captures the ones the buyer actually approved, cancels (and restocks)
 *   the rest.
 * Per-order failures are logged and retried on the next run, never fatal to
 * the sweep.
 */
export default async function reconcileAbandonedPaypalOrders() {
  const paypalConfig = getConfig('system.paypal', {}) as Record<string, unknown>;
  await settlePendingPaypalPayments(
    createStandaloneAxiosInstance,
    parseFloat(String(paypalConfig.pendingPaymentTtlDays)) ||
      DEFAULT_PENDING_PAYMENT_TTL_DAYS
  );
  const ttlHours =
    parseFloat(String(paypalConfig.abandonedOrderTtlHours)) ||
    DEFAULT_ABANDONED_TTL_HOURS;
  const cutoff = new Date(Date.now() - ttlHours * 3600 * 1000).toISOString();
  const orders = await select()
    .from('order')
    .where('payment_method', 'IN', PAYPAL_METHOD_CODES)
    .and('payment_status', '=', 'pending')
    .and('created_at', '<', cutoff)
    .execute(pool);
  if (orders.length === 0) {
    debug('PayPal reconciliation: no abandoned orders');
    return;
  }
  for (const order of orders) {
    try {
      const outcome = await reconcileOrder(order);
      info(
        `PayPal reconciliation: order ${order.uuid} resolved to ${outcome}`
      );
    } catch (e) {
      error(e);
    }
  }
}
