import type { ShipmentStatus } from '../../../types/order.js';

/**
 * Recommended canonical shipment-status set, aligned with the AfterShip /
 * Shippo / EasyPost vocabulary. Carrier extensions import this constant and
 * register the entries that match their underlying carrier's status emissions,
 * so multiple extensions converge on the same status codes instead of
 * inventing their own.
 *
 *   import { CANONICAL_SHIPMENT_STATUSES } from '@evershop/evershop/oms';
 *   import { registerShipmentStatus } from '@evershop/evershop/oms/services';
 *
 *   // In the extension's bootstrap
 *   for (const [code, detail] of Object.entries(CANONICAL_SHIPMENT_STATUSES)) {
 *     if (!getShipmentStatusList()[code]) {
 *       registerShipmentStatus(code, detail);
 *     }
 *   }
 *
 * Core does NOT auto-register these — that's the extension's call. If two
 * extensions try to register the same code without the guard, the second one
 * throws (today's `registerShipmentStatus` behavior).
 *
 * The built-in `delivered` status from the oms defaults is intentionally not
 * duplicated here; the `delivered` phase has only the one canonical name.
 *
 * See wiki/multi-shipment-design.md → "Canonical status constant".
 */
export const CANONICAL_SHIPMENT_STATUSES: Record<string, ShipmentStatus> = {
  // shipped phase
  in_transit: {
    name: 'In Transit',
    badge: 'default',
    phase: 'shipped'
  },
  out_for_delivery: {
    name: 'Out for Delivery',
    badge: 'warning',
    phase: 'shipped'
  },
  attempt_fail: {
    name: 'Delivery Attempt Failed',
    badge: 'warning',
    phase: 'shipped'
  },
  available_for_pickup: {
    name: 'Available for Pickup',
    badge: 'warning',
    phase: 'shipped'
  },
  exception: {
    name: 'Exception',
    badge: 'destructive',
    phase: 'shipped'
  },

  // canceled phase
  returned: {
    name: 'Returned',
    badge: 'destructive',
    phase: 'canceled'
  },
  expired: {
    name: 'Expired',
    badge: 'destructive',
    phase: 'canceled'
  }
};
