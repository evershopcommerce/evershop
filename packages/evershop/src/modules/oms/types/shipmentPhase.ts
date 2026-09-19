/**
 * The three lifecycle phases the rollup math understands. Fixed in code; the
 * predicate vocabulary of `oms.order.shipmentRollup` and the per-shipment
 * timestamp columns (`shipped_at`, `delivered_at`, `canceled_at`) are
 * hard-wired against these names.
 *
 * There is no `pending` phase: a shipment row only exists because something
 * was actually shipped (stock is deducted at order placement, so there is no
 * pre-shipped reservation to model), so every shipment starts in `shipped`.
 * `pending` survives only as an order-level ROLLUP value ("no items shipped
 * yet") — see `OrderShipmentRollup`.
 *
 * Statuses (the human-visible labels admin / extensions register via
 * `registerShipmentStatus`) tag themselves with one of these via their
 * `phase` field. Extensions can add custom statuses freely — they cannot
 * add a fourth phase.
 *
 * See wiki/multi-shipment-design.md → "Status model" → "Phases (hardcoded)".
 */
export type ShipmentPhase = 'shipped' | 'delivered' | 'canceled';
