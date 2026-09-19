/**
 * Shape of the JSONB column `cart.shipping_method_data` (and the equivalent
 * column on `order`). Holds the customer's shipping selection plus an
 * immutable snapshot of the method's pricing and metadata.
 *
 * The snapshot lets the cart/order remain meaningful even if the provider
 * goes offline or removes the method. Cost-related fields stay in the cart's
 * currency by construction (providers must quote in ctx.currency or return
 * no methods).
 *
 * See wiki/shipping-provider-design.md for the lifecycle.
 */

import type { ShippingMethod } from './shippingProvider.js';

/**
 * Snapshot of a shipping method at the time of selection.
 * Identical to `ShippingMethod` from the provider — copied verbatim on select.
 */
export type ShippingMethodSnapshot = ShippingMethod;

export interface ShippingMethodData {
  /** Provider code (e.g., 'core', 'usps'). Looked up in the shipping provider registry. */
  provider_code: string;
  /**
   * Provider-stable method code. Opaque to the platform — see
   * `ShippingMethod.code`.
   */
  method_code: string;
  /** Snapshot of the method at selection time (or last successful revalidation). */
  snapshot: ShippingMethodSnapshot;
  /**
   * Cart-only. Hash of (destination, totalWeight, totalValue, items_signature)
   * at the time the snapshot was produced. If the current cart's fingerprint
   * matches AND the snapshot is within TTL, the snapshot is trusted without
   * re-quoting the provider. Absent on order rows (orders don't recompute).
   */
  fingerprint?: string;
  /**
   * Cart-only. ISO 8601 timestamp when the snapshot was produced.
   * Compared against `ShippingProvider.quoteTtlSeconds` to decide whether
   * the snapshot is still fresh. Absent on order rows.
   */
  quotedAt?: string;
}
