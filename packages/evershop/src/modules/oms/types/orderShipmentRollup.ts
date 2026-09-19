/**
 * The seven possible values the rollup produces. Distinct from `ShipmentPhase`:
 *
 *   - `partially_shipped`, `partially_delivered`, and `partially_canceled`
 *     exist only here. A single shipment can never be any of them — they're
 *     order-level summary words. They are NOT registered as
 *     `oms.order.shipmentStatus` entries; the admin UI renders their
 *     name/badge via `getRollupDisplay()`.
 *
 *   - `canceled` arises two ways: the whole-order short-circuit
 *     (`order.status === 'canceled'`), OR the item math when every shippable
 *     item is in a canceled shipment (`all:canceled`). `partially_canceled`
 *     is the item-math result when some — but not all — items are canceled
 *     and nothing else has shipped/delivered (`any:canceled`). Canceling all
 *     shipments no longer cancels the order itself — see `psoMapping`
 *     (`*:canceled` → `processing`).
 *
 * See wiki/multi-shipment-design.md → "Rollup output (hardcoded)".
 */
export type OrderShipmentRollup =
  | 'pending'
  | 'partially_shipped'
  | 'shipped'
  | 'partially_delivered'
  | 'delivered'
  | 'partially_canceled'
  | 'canceled';
