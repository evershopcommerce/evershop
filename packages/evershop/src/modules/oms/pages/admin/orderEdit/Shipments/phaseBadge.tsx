import { Badge } from '@components/common/ui/Badge.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Single source of truth for phase-coded badge styling. Used by both the
 * Items card (per-item fulfillment) and the Shipments card (per-shipment
 * status). Before this file, the two surfaces drifted — the same `shipped`
 * label rendered as a solid blue chip in Items.tsx but as an amber outline
 * with a leading dot in ShipmentRow.tsx. Consolidating here keeps the two
 * surfaces visually identical for the same phase.
 *
 * Item-level extras (`partial_shipped`, `digital`) extend the same mapping
 * but with treatments that distinguish them from the phase-aligned entries:
 *   - `partial_shipped` uses the warning tone WITHOUT the dot, so it's
 *     clearly distinguishable from full `shipped` (which DOES carry the
 *     dot) at a glance.
 *   - `digital` is a neutral outline since digital items have no
 *     shipment lifecycle.
 *
 * The dot is the load-bearing visual signal that this is an "active"
 * lifecycle status; informational tags (digital, partial) don't get one.
 */

type Variant = 'success' | 'warning' | 'destructive' | 'outline';

interface BadgeMeta {
  variant: Variant;
  label: string;
  /** Leading dot before the label. Indicates an active lifecycle status. */
  dot?: boolean;
  className?: string;
}

const META: Record<string, BadgeMeta> = {
  // Phase-aligned — used in BOTH the Items card and the Shipments card.
  pending: { variant: 'outline', label: 'Pending' },
  shipped: { variant: 'warning', label: 'Shipped', dot: true },
  delivered: { variant: 'success', label: 'Delivered', dot: true },
  canceled: { variant: 'destructive', label: 'Canceled', dot: true },
  // Item-only — not a real shipment phase, but produced by the per-item
  // `fulfillmentBadge` resolver to mean "some-but-not-all units shipped."
  partial_shipped: { variant: 'warning', label: 'Partial shipped' },
  // Item-only — `noShippingRequired` short-circuit.
  digital: { variant: 'outline', label: 'Digital' }
};

export function PhaseBadge({
  code,
  fallbackLabel
}: {
  code: string;
  /** Used when `code` isn't in META. Lets ShipmentRow show the registry's
   *  human name for extension-registered custom statuses (e.g. carrier-
   *  canonical `out_for_delivery`) without losing the visual treatment. */
  fallbackLabel?: string;
}) {
  const meta = META[code] ?? {
    variant: 'outline' as const,
    label: fallbackLabel ?? code
  };
  return (
    <Badge variant={meta.variant} className={meta.className}>
      {meta.dot && (
        <span className="inline-block size-1.5 rounded-full bg-current" />
      )}
      {_(meta.label)}
    </Badge>
  );
}
