import { getValueSync } from '../../../lib/util/registry.js';
import type { OrderShipmentRollup } from '../types/orderShipmentRollup.js';

/**
 * Display data for the seven `OrderShipmentRollup` outputs. The rollup outputs
 * are NOT registered as `oms.order.shipmentStatus` entries (no `isDerivedOnly`
 * flag, none of that). Admin UI badge/name for `Order.shipmentStatus` reads
 * from this map instead of the status registry.
 *
 * Extensions can override via `addProcessor('rollupDisplay', (display, ctx) => …)`.
 * Same priority-ordered processor pattern as `psoMapping`.
 *
 * See wiki/multi-shipment-design.md → "Rollup output (hardcoded)".
 */
export const ROLLUP_DISPLAY: Record<
  OrderShipmentRollup,
  { name: string; badge: string }
> = {
  pending: { name: 'Pending', badge: 'default' },
  partially_shipped: { name: 'Partially Shipped', badge: 'warning' },
  shipped: { name: 'Shipped', badge: 'warning' },
  partially_delivered: { name: 'Partially Delivered', badge: 'warning' },
  delivered: { name: 'Delivered', badge: 'success' },
  partially_canceled: { name: 'Partially Canceled', badge: 'warning' },
  canceled: { name: 'Canceled', badge: 'destructive' }
};

/**
 * Returns the rollup display map after any registered `rollupDisplay`
 * processors have been applied. Pass `{}` as the context — symmetric with
 * `resolveShipmentRollup` so extensions register the same shape for both
 * processors.
 */
export function getRollupDisplay(): typeof ROLLUP_DISPLAY {
  return getValueSync('rollupDisplay', ROLLUP_DISPLAY, {});
}
