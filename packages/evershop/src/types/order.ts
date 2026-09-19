import type { ShipmentPhase } from '../modules/oms/types/shipmentPhase.js';

export type PaymentStatus = {
  name: string;
  badge: string;
  isDefault: boolean;
  /** Whether an order in this payment status can still be canceled (its authorization voided). */
  isCancelable?: boolean;
  /**
   * Whether an order in this payment status can be refunded. This is the *state*
   * half of refundability; the *capability* half is whether the order's payment
   * method registered a `refund` handler. The admin refund action shows only
   * when both hold. Mirrors `isCancelable`.
   */
  isRefundable?: boolean;
  /**
   * Whether an authorized-but-uncaptured payment in this status can be captured.
   * State half of capturability; the capability half is whether the method
   * registered a `capture` handler. The admin capture action shows only when
   * both hold.
   */
  isCapturable?: boolean;
  /**
   * Whether an uncaptured authorization in this status can be voided (released)
   * when the order is canceled. Capability half is a registered `void` handler.
   * Core calls `void` from `cancelOrder` for a voidable order — there is no
   * separate void action; voiding *is* canceling an authorized order.
   */
  isVoidable?: boolean;
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
