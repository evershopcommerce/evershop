import { select } from '@evershop/postgres-query-builder';
import { debug, error, info } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import cancelOrder from '../../oms/services/cancelOrder.js';
import { finalizePaypalOrderOrFail } from './finalizePaypalOrder.js';
import { createStandaloneAxiosInstance } from './requester.js';

export const DEFAULT_ABANDONED_TTL_HOURS = 6;

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
 * Resolve every PayPal order still `pending` past the abandonment TTL:
 * capture the ones the buyer actually approved, cancel (and restock) the rest.
 * Runs every 30 minutes; per-order failures are logged and retried on the
 * next run, never fatal to the sweep.
 */
export default async function reconcileAbandonedPaypalOrders() {
  const paypalConfig = getConfig('system.paypal', {}) as Record<string, unknown>;
  const ttlHours =
    parseFloat(String(paypalConfig.abandonedOrderTtlHours)) ||
    DEFAULT_ABANDONED_TTL_HOURS;
  const cutoff = new Date(Date.now() - ttlHours * 3600 * 1000).toISOString();
  const orders = await select()
    .from('order')
    .where('payment_method', '=', 'paypal')
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
