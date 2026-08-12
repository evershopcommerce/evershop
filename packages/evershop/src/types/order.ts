import type { ShipmentPhase } from '../modules/oms/types/shipmentPhase.js';

export type PaymentStatus = {
  name: string;
  badge: string;
  isDefault: boolean;
  isCancelable?: boolean;
};

export type ShipmentStatus = {
  name: string;
  badge: string;
  /**
   * The lifecycle phase this status belongs to. REQUIRED for new registrations
   * — `registerShipmentStatus` validates its presence at runtime. See
   * modules/oms/types/shipmentPhase.ts.
   */
  phase: ShipmentPhase;
  // `isDefault` and `isCancelable` are intentionally absent. The default
  // status is decided by `createShipment` (hardcoded to `shipped`), not by
  // a per-status flag. Cancelability is driven by the
  // `oms.order.shipmentRollupCancelable` map keyed on the order-level rollup
  // value, not by individual shipment statuses — see bootstrap.ts.
};

export type OrderStatus = {
  name: string;
  badge: string;
  isDefault: boolean;
  next: string[];
};
