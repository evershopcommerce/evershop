process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import config from 'config';
import { aggregateRollupStats } from '../../services/shipment/resolveShipmentRollup.js';

/**
 * Pure-function coverage for the canceled rollup math added when the `pending`
 * phase was removed and `partially_canceled` / `canceled` rollups were added.
 *
 * `aggregateRollupStats` reads the shipment-status → phase map from config, so
 * we register the three default statuses first. Rows mimic the per-(item,
 * status) GROUP BY that `fetchRollupRows` produces — an item with no shipment
 * appears once with status=null.
 */
beforeAll(() => {
  config.util.setModuleDefaults('oms', {
    order: {
      shipmentStatus: {
        shipped: { name: 'Shipped', badge: 'warning', phase: 'shipped' },
        delivered: { name: 'Delivered', badge: 'success', phase: 'delivered' },
        canceled: { name: 'Canceled', badge: 'destructive', phase: 'canceled' }
      }
    }
  });
});

describe('aggregateRollupStats — canceled handling', () => {
  it('every item fully canceled → allCanceled, and allPending (canceled counts zero toward shipped/delivered)', () => {
    const stats = aggregateRollupStats([
      { order_item_id: 1, qty_ordered: 2, status: 'canceled', qty: 2 },
      { order_item_id: 2, qty_ordered: 3, status: 'canceled', qty: 3 }
    ]);
    expect(stats.allCanceled).toBe(true);
    expect(stats.anyCanceled).toBe(true);
    expect(stats.allShipped).toBe(false);
    expect(stats.anyShipped).toBe(false);
    expect(stats.allDelivered).toBe(false);
    // Canceled items contribute nothing to shipped/delivered, so allPending is
    // also true here — the rule order (all:canceled before all:pending) is what
    // makes this resolve to `canceled`, not `pending`.
    expect(stats.allPending).toBe(true);
  });

  it('some canceled + some unshipped → anyCanceled but not allCanceled', () => {
    const stats = aggregateRollupStats([
      { order_item_id: 1, qty_ordered: 2, status: 'canceled', qty: 2 },
      { order_item_id: 2, qty_ordered: 1, status: null, qty: null }
    ]);
    expect(stats.anyCanceled).toBe(true);
    expect(stats.allCanceled).toBe(false);
    expect(stats.anyShipped).toBe(false);
    expect(stats.allPending).toBe(true);
  });

  it('canceled then re-shipped (same item) → reads as shipped, anyCanceled still true', () => {
    const stats = aggregateRollupStats([
      { order_item_id: 1, qty_ordered: 5, status: 'canceled', qty: 5 },
      { order_item_id: 1, qty_ordered: 5, status: 'shipped', qty: 5 }
    ]);
    // qty_shipped(5) + qty_delivered(0) === qty_ordered(5) → fully shipped.
    // Rule order checks all:shipped before the canceled rules, so this is
    // `shipped`, not `canceled`, even though anyCanceled is true.
    expect(stats.allShipped).toBe(true);
    expect(stats.anyCanceled).toBe(true);
    expect(stats.allCanceled).toBe(true); // qty_canceled(5) >= ordered(5)
  });

  it('no shipments at all → everything false except allPending', () => {
    const stats = aggregateRollupStats([
      { order_item_id: 1, qty_ordered: 2, status: null, qty: null }
    ]);
    expect(stats.anyCanceled).toBe(false);
    expect(stats.allCanceled).toBe(false);
    expect(stats.anyShipped).toBe(false);
    expect(stats.allPending).toBe(true);
  });
});
