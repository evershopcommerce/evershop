import type { Address } from '../../../../types/customerAddress.js';
import type {
  ShippingZoneRow,
  ShippingZoneProviderRow
} from '../../../../types/db/index.js';
import type {
  ShippingContext,
  ShippingProvider
} from '../../../../types/shippingProvider.js';
import { getStoreCurrency } from '../../../setting/services/setting.js';
import { getOriginAddress } from './getOriginAddress.js';
import { serializeItems } from './serializeItems.js';

interface CartLike {
  getData(key: string): unknown;
  getItems(): Array<{ getData(key: string): unknown }>;
}

export interface BuildShippingContextArgs {
  cart: CartLike;
  provider: ShippingProvider;
  zone: ShippingZoneRow;
  /** Pre-loaded row from `shipping_zone_provider` (the attachment). */
  attachment?: Pick<ShippingZoneProviderRow, 'config'> | null;
  /** Optional address override (used when the caller supplies a tentative address). */
  destinationOverride?: Address | null;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * Compose a `ShippingContext` for a single (cart, provider, zone) tuple.
 *
 * The orchestrator (see Phase 3's rewrite of `getAvailableShippingMethods.ts`)
 * resolves zones from the destination address, loads the provider attachment
 * rows for those zones, and calls this helper once per (zone, provider)
 * combination. Pre-loading `attachment` avoids per-call round trips to
 * Postgres when iterating across many zones / providers.
 *
 * Origin is composed from store settings via `getOriginAddress`. Items are
 * serialized into plain DTOs via `serializeItems` — providers never see
 * `CartItem` class instances.
 *
 * See wiki/shipping-provider-design.md → "Data flow".
 */
export async function buildShippingContext(
  args: BuildShippingContextArgs
): Promise<ShippingContext> {
  const { cart, zone, attachment, destinationOverride } = args;

  const origin = await getOriginAddress();

  const destination =
    destinationOverride ?? ((cart.getData('shipping_address') as Address) || {});

  const items = serializeItems(cart);

  const currency =
    (cart.getData('currency') as string | undefined) || getStoreCurrency();

  return {
    origin,
    destination,
    zone,
    items,
    totalWeight: toNumber(cart.getData('total_weight')),
    totalValue: toNumber(cart.getData('sub_total')),
    currency,
    zoneConfig: (attachment?.config as Record<string, unknown>) ?? {},
    // Registry-only providers don't have a persisted global config — the
    // global form was hoisted out before release. Per-zone state still lives
    // in `attachment.config`, and secrets are read directly from
    // `process.env` inside the extension.
    providerConfig: {}
  };
}
