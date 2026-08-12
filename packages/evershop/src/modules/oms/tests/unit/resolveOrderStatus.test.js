process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import config from 'config';
import { resolveOrderStatus } from '../../services/updateOrderStatus.js';

/**
 * Regression for the partial-shipment crash. Before this fix,
 * `resolveOrderStatus(paymentStatus, 'partially_shipped')` threw because
 * 'partially_shipped' isn't a registered shipment status — only a rollup
 * output. Bootstrap's `hookAfter('changeShipmentStatus')` calls
 * `resolveOrderStatus(payment_status, status)` with that value the moment
 * the first partial shipment lands, rolling back the whole transaction.
 */

const baseDefaults = {
  order: {
    // Post-§1 defaults: no `pending` or `processing` in the shipment-status
    // registry. `pending` lives only as an order-level ROLLUP value now.
    shipmentStatus: {
      shipped: { name: 'Shipped', badge: 'warning', phase: 'shipped' },
      delivered: { name: 'Delivered', badge: 'success', phase: 'delivered' },
      canceled: { name: 'Canceled', badge: 'destructive', phase: 'canceled' }
    },
    paymentStatus: {
      pending: { name: 'Pending', badge: 'default', isDefault: true, isCancelable: true },
      paid: { name: 'Paid', badge: 'success', isCancelable: false },
      canceled: { name: 'Canceled', badge: 'destructive', isCancelable: true }
    },
    status: {
      new: { name: 'New', badge: 'default', isDefault: true, next: ['processing', 'canceled'] },
      processing: { name: 'Processing', badge: 'default', next: ['completed', 'canceled'] },
      completed: { name: 'Completed', badge: 'success', next: ['closed'] },
      canceled: { name: 'Canceled', badge: 'destructive', next: [] },
      closed: { name: 'Closed', badge: 'outline', next: [] }
    },
    psoMapping: {
      'pending:pending': 'new',
      'pending:*': 'processing',
      'paid:pending': 'processing',
      'paid:partially_shipped': 'processing',
      'paid:shipped': 'processing',
      'paid:partially_delivered': 'processing',
      'paid:delivered': 'completed',
      '*:partially_canceled': 'processing',
      '*:canceled': 'processing',
      'canceled:canceled': 'canceled',
      'canceled:*': 'canceled'
    },
    reStockAfterCancellation: true
  }
};

beforeAll(() => {
  config.util.setModuleDefaults('oms', baseDefaults);
});

describe('resolveOrderStatus rollup tolerance', () => {
  it('accepts partially_shipped (rollup-only value, not in registry)', () => {
    expect(resolveOrderStatus('paid', 'partially_shipped')).toBe('processing');
  });

  it('accepts partially_delivered (rollup-only value, not in registry)', () => {
    expect(resolveOrderStatus('paid', 'partially_delivered')).toBe('processing');
  });

  it("accepts pending (rollup-only value post-§1 — canceling the order's last shipment rolls up to pending)", () => {
    // Regression: §1 removed `pending` from the shipment-status registry,
    // but the order-level rollup still uses it to mean "no items shipped
    // yet." Without `pending` in the rollup allowlist, canceling the only
    // shipment on an order would throw "Shipment status 'pending' is
    // invalid" inside `updateShipmentStatus`'s transaction and roll back.
    expect(resolveOrderStatus('paid', 'pending')).toBe('processing');
  });

  it('still resolves registered statuses', () => {
    expect(resolveOrderStatus('paid', 'shipped')).toBe('processing');
    expect(resolveOrderStatus('paid', 'delivered')).toBe('completed');
  });

  it('still rejects unknown payment status', () => {
    expect(() => resolveOrderStatus('not-a-payment-status', 'pending')).toThrow(
      /Payment status is invalid/
    );
  });

  it('still rejects unknown shipment status when not a rollup value', () => {
    expect(() => resolveOrderStatus('paid', 'totally_made_up_status')).toThrow(
      /Shipment status 'totally_made_up_status' is invalid/
    );
  });

  it('payment-side cancellation still cancels the order', () => {
    // The order is canceled by the PAYMENT going to `canceled` (what
    // cancelOrder does), via `canceled:*`.
    expect(resolveOrderStatus('canceled', 'pending')).toBe('canceled');
    // Exact `canceled:canceled` protects the cancelOrder flow: it cancels the
    // payment, then cancels the shipments (rollup → canceled). Without the
    // exact rule, `*:canceled` → processing would shadow `canceled:*` and the
    // no-revert guard would throw.
    expect(resolveOrderStatus('canceled', 'canceled')).toBe('canceled');
  });

  it('shipment-side cancellation keeps the order processing (no auto-cancel)', () => {
    // Canceling shipments on a still-paid order must NOT cancel the order.
    expect(resolveOrderStatus('paid', 'canceled')).toBe('processing');
    expect(resolveOrderStatus('paid', 'partially_canceled')).toBe('processing');
  });
});
