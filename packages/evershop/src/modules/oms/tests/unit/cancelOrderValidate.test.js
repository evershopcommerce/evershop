process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import config from 'config';
import { validateStatusForTests } from '../../services/cancelOrder.js';

/**
 * Regression for the partially-shipped/delivered cancel crash. Before this
 * fix, `cancelOrder.validateStatus(paymentStatus, 'partially_shipped')` did
 * `shipmentStatusList['partially_shipped'].isCancelable` — `partially_*`
 * are rollup-only values that aren't in the per-shipment-status registry, so
 * the dereference threw TypeError on the `.isCancelable` lookup. Same family
 * as `resolveOrderStatus` (which had the same shape, fixed earlier).
 *
 * Cancelability for the order-level rollup vocabulary now lives in the
 * `oms.order.shipmentRollupCancelable` config map, keyed by the rollup value
 * itself — no more dereference against a registry it can't possibly be in.
 */

const baseDefaults = {
  order: {
    shipmentStatus: {
      shipped: { name: 'Shipped', badge: 'warning', phase: 'shipped' },
      delivered: { name: 'Delivered', badge: 'success', phase: 'delivered' },
      canceled: { name: 'Canceled', badge: 'destructive', phase: 'canceled' }
    },
    paymentStatus: {
      pending: { name: 'Pending', badge: 'default', isCancelable: true },
      paid: { name: 'Paid', badge: 'success', isCancelable: false },
      canceled: { name: 'Canceled', badge: 'destructive', isCancelable: true }
    },
    status: {
      new: { name: 'New', badge: 'default', isDefault: true, next: ['processing', 'canceled'] },
      processing: { name: 'Processing', badge: 'default', next: ['completed', 'canceled'] },
      completed: { name: 'Completed', badge: 'success', next: [] },
      canceled: { name: 'Canceled', badge: 'destructive', next: [] }
    },
    shipmentRollupCancelable: {
      pending: true,
      partially_shipped: true,
      shipped: true,
      partially_delivered: true,
      delivered: false,
      partially_canceled: true,
      canceled: true
    },
    reStockAfterCancellation: true
  }
};

beforeAll(() => {
  config.util.setModuleDefaults('oms', baseDefaults);
});

describe('cancelOrder.validateStatus rollup-cancelable', () => {
  // Use `pending` payment for rollup-side assertions. It's the only payment
  // status with isCancelable=true in defaults, so the rollup decision
  // actually gets evaluated (otherwise the payment side short-circuits).

  it("accepts partially_shipped (rollup-only value, doesn't crash anymore)", () => {
    expect(validateStatusForTests('pending', 'partially_shipped')).toBe(true);
  });

  it('accepts partially_delivered', () => {
    expect(validateStatusForTests('pending', 'partially_delivered')).toBe(true);
  });

  it('rejects when rollup says delivered (terminal)', () => {
    expect(validateStatusForTests('pending', 'delivered')).toBe(false);
  });

  it('accepts when rollup says canceled (shipments canceled, order still alive)', () => {
    // Canceling shipments now keeps the order in `processing`, so the order
    // must remain cancelable in the canceled / partially_canceled rollups.
    expect(validateStatusForTests('pending', 'canceled')).toBe(true);
    expect(validateStatusForTests('pending', 'partially_canceled')).toBe(true);
  });

  it('rejects when payment side says no (paid is not cancelable)', () => {
    expect(validateStatusForTests('paid', 'pending')).toBe(false);
  });

  it('accepts pending payment + shipped rollup (the canonical "cancel after shipping" path)', () => {
    expect(validateStatusForTests('pending', 'shipped')).toBe(true);
  });

  it('does NOT throw on unknown rollup values', () => {
    expect(() =>
      validateStatusForTests('pending', 'totally_made_up_rollup')
    ).not.toThrow();
  });
});
