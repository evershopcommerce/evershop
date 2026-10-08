import { select } from '@evershop/postgres-query-builder';
import { error } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import type {
  ShippingZoneProviderRow,
  ShippingZoneRow
} from '../../../types/db/index.js';
import type {
  ShippingMethod,
  ShippingProvider
} from '../../../types/shippingProvider.js';
import { getCartByUUID } from './getCartByUUID.js';
import { buildShippingContext } from './shipping/buildShippingContext.js';
import { getAllShippingProviders } from './shipping/registry.js';
import { resolveZonesForAddress } from './shipping/resolveZonesForAddress.js';

/**
 * Available shipping method as exposed to the GraphQL/storefront layer.
 *
 * `id` and `code` are intentionally duplicated for back-compat with the
 * pre-refactor `AvailableShippingMethod` GraphQL type (which had both
 * `id: String!` and `code: String!`). Phase 4 will widen the GraphQL type
 * with `providerCode`, `carrier`, `delivery`; consumers continue to read
 * `id`/`code`/`name`/`cost` unchanged through that transition.
 */
export interface AvailableShippingMethodResult extends ShippingMethod {
  id: string;
  providerCode: string;
}

const DEFAULT_PROVIDER_TIMEOUT_MS = 5000;

/**
 * Wrap a promise with a timeout. Used for per-provider calls so a slow
 * carrier doesn't block the whole list.
 */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms
    );
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/**
 * Orchestrator. Registry-only provider dispatch — no DB rows for providers
 * (the in-memory registry IS the provider list):
 *
 *   1. Resolve zones that cover the destination address.
 *   2. Load enabled `shipping_zone_provider` attachment rows for those zones.
 *   3. For each attachment, look up the registered provider by
 *      `attachment.provider_code`. Missing-from-registry attachments
 *      (extension uninstalled) are silently skipped.
 *   4. For each (zone, provider) tuple, in parallel:
 *      - Build a ShippingContext.
 *      - Call provider.getMethods(ctx) with a per-provider timeout.
 *      - On error/timeout: log + skip; do not fail the whole list.
 *   5. Concat results, dedupe by (provider_code, code) keeping the first
 *      occurrence, sort by cost ascending.
 *
 * `destination` optionally overrides the cart's stored shipping address field
 * by field (useful for pre-checkout rate calculators before the customer has
 * saved an address). Keys follow the address vocabulary (spec § 3.10, D-16).
 *
 * See wiki/shipping-provider-design.md → "Data flow" / "Listing methods at checkout".
 */
export interface ShippingDestination {
  country?: string | null;
  administrative_area?: string | null;
  locality?: string | null;
  dependent_locality?: string | null;
  postal_code?: string | null;
}

export async function getAvailableShippingMethods(
  cartId: string,
  destination: ShippingDestination = {}
): Promise<AvailableShippingMethodResult[]> {
  const cart = await getCartByUUID(cartId);
  if (!cart) {
    throw new Error('Cart not found');
  }

  // Resolve destination address — defined overrides win field by field.
  const stored = (cart.getData('shipping_address') ?? {}) as ShippingDestination &
    Record<string, unknown>;
  const effective: ShippingDestination & Record<string, unknown> = { ...stored };
  for (const [key, value] of Object.entries(destination)) {
    if (value !== undefined) {
      effective[key] = value;
    }
  }
  const destinationCountry = effective.country ?? null;

  if (!destinationCountry) return [];

  const zones = await resolveZonesForAddress({
    country: destinationCountry,
    administrativeArea: effective.administrative_area,
    postalCode: effective.postal_code
  });
  if (zones.length === 0) return [];

  const zoneIds = zones.map((z) => z.shipping_zone_id);

  // Load attachments for the matching zones.
  const attachments = (await select()
    .from('shipping_zone_provider')
    .where('zone_id', 'IN', zoneIds)
    .and('is_enabled', '=', true)
    .execute(pool)) as ShippingZoneProviderRow[];
  if (attachments.length === 0) return [];

  // Cross-reference attachments with the registry. The attachment carries
  // `provider_code` directly (soft ref), so no provider-table lookup is
  // needed. Attachments whose provider isn't registered (extension
  // uninstalled, never installed) are silently skipped — orphan attachments
  // are inert.
  const registered = await getAllShippingProviders();
  const registeredByCode = new Map<string, ShippingProvider>();
  for (const p of registered) registeredByCode.set(p.code, p);

  type CallTarget = {
    zone: ShippingZoneRow;
    provider: ShippingProvider;
    attachment: ShippingZoneProviderRow;
  };

  const calls: CallTarget[] = [];
  for (const att of attachments) {
    const provider = registeredByCode.get(att.provider_code);
    if (!provider) continue; // attached but not registered
    const zone = zones.find((z) => z.shipping_zone_id === att.zone_id);
    if (!zone) continue;
    calls.push({ zone, provider, attachment: att });
  }
  if (calls.length === 0) return [];

  // Fan out in parallel with per-provider timeout. allSettled so one slow or
  // broken provider doesn't kill the whole list — failures are logged and skipped.
  const results = await Promise.allSettled(
    calls.map(async ({ zone, provider, attachment }) => {
      const ctx = await buildShippingContext({
        cart,
        provider,
        zone,
        attachment,
        destinationOverride: effective
      });
      const methods = await withTimeout(
        provider.getMethods(ctx),
        // Per-provider override: slow-by-design upstreams (aggregator
        // rate-shopping) can declare a larger budget than the default.
        provider.quoteTimeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS,
        `Provider ${provider.code} (zone ${zone.shipping_zone_id})`
      );
      return { providerCode: provider.code, methods };
    })
  );

  // Dedupe by (provider_code, method.code) — first match wins.
  const collected: AvailableShippingMethodResult[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (r.status === 'rejected') {
      error(r.reason);
      continue;
    }
    const { providerCode, methods } = r.value;
    for (const m of methods) {
      const key = `${providerCode}:${m.code}`;
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push({
        id: m.code,
        providerCode,
        ...m
      });
    }
  }

  collected.sort((a, b) => a.cost - b.cost);
  return collected;
}
