process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import config from 'config';
import {
  createOrder,
  openScratchDb,
  ScratchDb
} from './helpers/orderScratchDb.js';

/**
 * The statuses core moves an order to when it records a capture or a refund.
 * Core derived them from the order's method (`<method>_captured`,
 * `<method>_refunded`, `<method>_partial_refunded`), so a method whose code
 * differs from its statuses' prefix (PayPal's Venmo on `paypal_*`, the four
 * Authorize.net codes on `authorize_dot_net_*`) moved its orders to statuses
 * nobody registered: `updatePaymentStatus` threw after the gateway had moved
 * the money, and the local record rolled back. A method now declares
 * `statuses`; a capture handler may return the status of what it did.
 *
 * Real services on a scratch database with every core migration; the gateway
 * handlers are stubs. Skips itself when no Postgres server is reachable.
 */
const scratch: ScratchDb | null = await openScratchDb(
  'evershop_payment_statuses_scratch_test'
);
const describeDb = scratch ? describe : describe.skip;

describeDb('statuses declared by a payment method (scratch DB)', () => {
  const db = scratch!.db;
  let captureOrder: typeof import('../../services/captureOrder.js')['captureOrder'];
  let refundOrder: typeof import('../../services/refundOrder.js')['refundOrder'];
  let recordRefund: typeof import('../../services/recordRefund.js')['recordRefund'];
  let refunds = 0;

  async function insertRow(table: string, values: Record<string, unknown>) {
    const { rows: columns } = await db.query(
      `SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = $1
          AND is_nullable = 'NO' AND column_default IS NULL
          AND is_identity = 'NO'`,
      [table]
    );
    const row: Record<string, unknown> = {};
    for (const c of columns) {
      row[c.column_name] = /int|numeric|double|real/.test(c.data_type)
        ? 10
        : `test-${c.column_name}`;
    }
    Object.assign(row, values);
    const names = Object.keys(row);
    await db.query(
      `INSERT INTO "${table}" (${names.map((n) => `"${n}"`).join(', ')})
       VALUES (${names.map((_, i) => `$${i + 1}`).join(', ')})`,
      names.map((n) => row[n])
    );
  }

  /** An authorized 10.00 USD order of `method`, with its authorization */
  async function authorizedOrder(method: string) {
    const order = await createOrder(db, {
      payment_method: method,
      payment_status: 'gateway_authorized',
      grand_total: 10
    });
    await insertRow('payment_transaction', {
      payment_transaction_order_id: order.order_id,
      transaction_id: `AUTH-${order.order_id}`,
      amount: 10,
      payment_action: 'authorize',
      transaction_type: 'online'
    });
    return order;
  }

  const paymentStatus = async (order: Record<string, any>) =>
    (
      await db.query(`SELECT payment_status FROM "order" WHERE order_id = $1`, [
        order.order_id
      ])
    ).rows[0].payment_status;

  beforeAll(async () => {
    config.util.setModuleDefaults('oms', {
      order: {
        paymentStatus: {
          gateway_authorized: {
            name: 'Authorized',
            badge: 'warning',
            isCapturable: true
          },
          gateway_captured: {
            name: 'Captured',
            badge: 'success',
            isRefundable: true
          },
          gateway_pending: { name: 'Payment Pending', badge: 'warning' },
          gateway_partial_refunded: {
            name: 'Partial Refunded',
            badge: 'destructive',
            isRefundable: true
          },
          gateway_refunded: { name: 'Refunded', badge: 'destructive' }
        }
      }
    });
    const { registerPaymentMethod } = await import(
      '../../../checkout/services/getAvailablePaymentMethods.js'
    );
    const handlers = {
      capture: async ({ transaction }) => ({
        transactionId: `CAP-${transaction.transaction_id}`,
        amount: 10
      }),
      refund: async ({ amount }) => {
        refunds += 1;
        return { transactionId: `REF-${refunds}`, amount };
      }
    };
    // A second code on the gateway's statuses, as Venmo is on PayPal's
    registerPaymentMethod({
      init: () => ({ code: 'shared_wallet', name: 'Shared wallet' }),
      validator: () => true,
      statuses: {
        captured: 'gateway_captured',
        refunded: 'gateway_refunded',
        partialRefunded: 'gateway_partial_refunded'
      },
      ...handlers
    });
    // A capture the gateway reports as not settled yet
    registerPaymentMethod({
      init: () => ({ code: 'slow_wallet', name: 'Slow wallet' }),
      validator: () => true,
      statuses: { captured: 'gateway_captured' },
      capture: async ({ transaction }) => ({
        transactionId: `CAP-${transaction.transaction_id}`,
        amount: 10,
        status: 'gateway_pending'
      })
    });

    ({ captureOrder } = await import('../../services/captureOrder.js'));
    ({ refundOrder } = await import('../../services/refundOrder.js'));
    ({ recordRefund } = await import('../../services/recordRefund.js'));
  });

  afterAll(async () => {
    await scratch?.close();
  });

  it('captures onto the declared status, not <method>_captured', async () => {
    const order = await authorizedOrder('shared_wallet');
    await expect(captureOrder(order.uuid)).resolves.toEqual({
      status: 'gateway_captured'
    });
    expect(await paymentStatus(order)).toBe('gateway_captured');
  });

  it('refunds onto the declared partial and full statuses', async () => {
    const order = await authorizedOrder('shared_wallet');
    await captureOrder(order.uuid);
    await expect(refundOrder(order.uuid, 4)).resolves.toEqual({
      status: 'gateway_partial_refunded',
      isFullRefund: false
    });
    await expect(refundOrder(order.uuid, 6)).resolves.toEqual({
      status: 'gateway_refunded',
      isFullRefund: true
    });
    expect(await paymentStatus(order)).toBe('gateway_refunded');
  });

  it('records a gateway-initiated refund (webhook) onto the declared status', async () => {
    const order = await authorizedOrder('shared_wallet');
    await captureOrder(order.uuid);
    const fresh = (
      await db.query(`SELECT * FROM "order" WHERE order_id = $1`, [
        order.order_id
      ])
    ).rows[0];
    const result = await recordRefund({
      order: fresh,
      transactionId: 'REF-FROM-DASHBOARD',
      amount: 10
    });
    expect(result.status).toBe('gateway_refunded');
    expect(await paymentStatus(order)).toBe('gateway_refunded');
  });

  it('uses the status the capture handler returned over the declared one', async () => {
    const order = await authorizedOrder('slow_wallet');
    await expect(captureOrder(order.uuid)).resolves.toEqual({
      status: 'gateway_pending'
    });
    expect(await paymentStatus(order)).toBe('gateway_pending');
  });
});
