import { select } from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import type { ShippingZoneProviderRow } from '../../../../types/db/index.js';
import type { Cart } from '../cart/Cart.js';
import { buildShippingContext } from './buildShippingContext.js';
import { computeFingerprintFromCart } from './computeFingerprint.js';
import { getShippingProvider } from './registry.js';
import { resolveZonesForAddress } from './resolveZonesForAddress.js';

export interface ShippingMethodIntent {
  provider_code: string;
  method_code: string;
}

export interface ResolvedShippingMethod {
  provider_code: string;
  method_code: string;
  snapshot: {
    code: string;
    name: string;
    cost: number;
    carrier?: string;
    delivery?: unknown;
  };
  fingerprint: string;
  quotedAt: string;
}

export class ShippingQuoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShippingQuoteError';
  }
}

/**
 * Fully resolve a shipping intent against the cart's current state into an
 * enriched snapshot. The "intent" is the bare `{ provider_code, method_code }`
 * the customer picked; the snapshot is what the provider answers when asked,
 * captured alongside a fingerprint of the cart state at quote time and a
 * timestamp.
 *
 * Shared by two callers:
 *
 *   - `setShippingMethod(cart, intent)` — the service used by API handlers and
 *     in-process checkout flows. Pre-resolves so it can call setData with the
 *     enriched value, satisfying DataObject's "resolver returns what was set"
 *     contract.
 *
 *   - The `shipping_method_data` field resolver — the dependency-rebuild path
 *     (Case 2). When `items` / `shipping_address` / totals change, the
 *     resolver runs without `setData` having been called on this field. The
 *     cached snapshot may be stale; the resolver calls back through this
 *     helper to re-quote.
 *
 * Throws `ShippingQuoteError` on any condition that should surface to the
 * caller (no provider, no zone, method no longer applies). Other errors
 * propagate as-is.
 *
 * See wiki/shipping-provider-design.md → "Recompute on cart change".
 */
export async function resolveShippingQuote(
  cart: Cart,
  intent: ShippingMethodIntent
): Promise<ResolvedShippingMethod> {
  if (!intent?.provider_code || !intent?.method_code) {
    throw new ShippingQuoteError('Missing provider_code or method_code');
  }

  const provider = await getShippingProvider(intent.provider_code);
  if (!provider) {
    throw new ShippingQuoteError(
      `Shipping provider "${intent.provider_code}" is not registered`
    );
  }

  const shippingAddress = cart.getData('shipping_address') as
    | {
        country?: string | null;
        province?: string | null;
        postcode?: string | null;
      }
    | undefined;
  if (!shippingAddress?.country) {
    throw new ShippingQuoteError('Shipping address is required');
  }

  const zones = await resolveZonesForAddress({
    country: shippingAddress.country,
    province: shippingAddress.province,
    postcode: shippingAddress.postcode
  });
  if (zones.length === 0) {
    throw new ShippingQuoteError('We do not ship to this address');
  }

  // Registered = enabled (the global `shipping_provider.is_enabled` toggle
  // is gone — the in-memory registry is the source of truth). The lookup
  // for `provider` above already returned a registered entry, so reaching
  // this line means the provider is live.

  const validate =
    provider.validateMethod ??
    (async (ctx, code) => {
      const methods = await provider.getMethods(ctx);
      return methods.find((m) => m.code === code) ?? null;
    });
  // Iterate zones in resolution order — first zone where the method still
  // validates wins. (Core's costs may differ per zone; this mirrors the
  // orchestrator's first-match-wins dedupe at list time.)
  let fresh: Awaited<ReturnType<typeof validate>> = null;
  for (const zone of zones) {
    const attachment = (await select()
      .from('shipping_zone_provider')
      .where('zone_id', '=', zone.shipping_zone_id)
      .and('provider_code', '=', provider.code)
      .and('is_enabled', '=', true)
      .load(pool)) as ShippingZoneProviderRow | undefined;
    if (!attachment) continue;
    try {
      const ctx = await buildShippingContext({
        cart,
        provider,
        zone,
        attachment
      });
      const m = await validate(ctx, intent.method_code);
      if (m) {
        fresh = m;
        break;
      }
    } catch (e) {
      error(e);
    }
  }

  if (!fresh) {
    throw new ShippingQuoteError(
      'Selected shipping method is no longer available'
    );
  }

  return {
    provider_code: intent.provider_code,
    method_code: intent.method_code,
    snapshot: fresh,
    fingerprint: computeFingerprintFromCart(cart),
    quotedAt: new Date().toISOString()
  };
}
