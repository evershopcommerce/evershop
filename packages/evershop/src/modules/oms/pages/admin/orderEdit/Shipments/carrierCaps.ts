/**
 * Shared capability predicate for the admin shipment UI.
 *
 * A carrier is considered to have a "tracking capability" if it implements
 * any method that interacts with a tracking number — that means:
 *
 *   - `generateTrackingUrl(trackingNumber)`  — builds a public URL
 *   - `createLabel(input)`                   — produces a tracking number
 *   - `voidLabel(trackingNumber)`            — voids a purchased label
 *   - `fetchStatus(trackingNumber)`          — polls live status
 *
 * If none of those are implemented (the canonical example is the built-in
 * "Custom / Other" carrier from `oms/bootstrap.ts`), the admin UI hides the
 * tracking-number input in both the create-shipment modal and the inline
 * edit-tracking form. Prompting for a tracking number when no carrier
 * method consumes one is misleading.
 *
 * The runtime carrier object itself isn't visible to the React layer — the
 * Carrier admin GraphQL surface only exposes the `capabilities` snapshot
 * (`Carrier.capabilities { createLabel, generateTrackingUrl, voidLabel,
 * fetchStatus, schedulePickup }`). This helper reads from that snapshot.
 */
export interface CarrierLike {
  code: string;
  name: string;
  capabilities?: {
    createLabel?: boolean;
    generateTrackingUrl?: boolean;
    voidLabel?: boolean;
    fetchStatus?: boolean;
  };
}

export function hasTrackingCapability(
  carrier: CarrierLike | undefined
): boolean {
  if (!carrier?.capabilities) return false;
  const c = carrier.capabilities;
  return !!(
    c.generateTrackingUrl ||
    c.createLabel ||
    c.voidLabel ||
    c.fetchStatus
  );
}
