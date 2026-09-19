import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import type {
  ShippingContext,
  ShippingMethod,
  ShippingProvider
} from '../../../../../types/shippingProvider.js';

/**
 * Core shipping provider — the in-package implementation backed by the
 * `core_shipping_method` and `core_shipping_method_rate` tables.
 *
 * Methods are admin-managed (one row per logical method); per-zone rates and
 * conditions live in the rate table. At query time we filter rates by:
 *   - the zone is the one being evaluated;
 *   - the rate's condition_type passes against cart totals (half-open
 *     `[min, max)` semantics — adjacent tiers no longer overlap at the boundary);
 *   - the cost is computable (flat, price-based tiers, or weight-based tiers).
 *
 * Returns cost in `ctx.currency`. Cost values are stored as decimals entered
 * by the admin; we trust they match the shop currency. Multi-currency support
 * is deferred — see wiki/shipping-provider-design.md → "Deferred".
 */

interface RateRow {
  method_uuid: string;
  method_name: string;
  method_sort_order: number;
  /** Merchant-chosen default carrier hint, mirrored from core_shipping_method. */
  default_carrier_code: string | null;
  /** Merchant-chosen default service code hint, mirrored from core_shipping_method. */
  default_service_code: string | null;
  cost: string | null;
  condition_type: 'price' | 'weight' | null;
  min: string | null;
  max: string | null;
  price_based_cost:
    | Array<{ min_price: string | number; cost: string | number }>
    | null;
  weight_based_cost:
    | Array<{ min_weight: string | number; cost: string | number }>
    | null;
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * Half-open condition check: [min, max). Cart at exactly `max` is excluded —
 * fixes the legacy double-closed bug where a cart at the tier boundary
 * matched both adjacent tiers.
 */
function passesCondition(
  conditionType: 'price' | 'weight' | null,
  min: number | null,
  max: number | null,
  totalValue: number,
  totalWeight: number
): boolean {
  if (!conditionType) return true;
  const value = conditionType === 'price' ? totalValue : totalWeight;
  if (min !== null && value < min) return false;
  if (max !== null && value >= max) return false;
  return true;
}

/**
 * Walk a sorted tier list. Highest min ≤ value wins. Tiers themselves are
 * naturally half-open because the next tier's min ends the previous tier's
 * range.
 */
function computeTierCost(
  tiers: Array<{ min: number; cost: number }>,
  value: number
): number {
  const sorted = tiers.slice().sort((a, b) => a.min - b.min);
  let cost = 0;
  for (const tier of sorted) {
    if (value >= tier.min) {
      cost = tier.cost;
    } else {
      break;
    }
  }
  return cost;
}

function computeCost(
  rate: RateRow,
  totalValue: number,
  totalWeight: number
): number | null {
  if (rate.cost !== null) {
    return toNumber(rate.cost);
  }
  if (rate.price_based_cost && rate.price_based_cost.length > 0) {
    const tiers = rate.price_based_cost.map((t) => ({
      min: toNumber(t.min_price),
      cost: toNumber(t.cost)
    }));
    return computeTierCost(tiers, totalValue);
  }
  if (rate.weight_based_cost && rate.weight_based_cost.length > 0) {
    const tiers = rate.weight_based_cost.map((t) => ({
      min: toNumber(t.min_weight),
      cost: toNumber(t.cost)
    }));
    return computeTierCost(tiers, totalWeight);
  }
  // No cost configured at all — skip this rate. Admin misconfiguration.
  return null;
}

export const coreShippingProvider: ShippingProvider = {
  code: 'core',
  name: 'Core Shipping',
  description:
    'Built-in admin-configured shipping methods with per-zone rates.',
  // No zoneConfigFields — Core's per-attachment config is empty.
  // Per-zone variation lives in core_shipping_method_rate (managed under
  // Settings → Shipping → Providers → Core → Methods).

  async getMethods(ctx: ShippingContext): Promise<ShippingMethod[]> {
    if (!ctx.zone) return [];

    // The top-level `select(...)` from postgres-query-builder is VARIADIC over
    // column names — it does NOT take (column, alias). Only the chained
    // `.select(col, alias)` form supports aliasing. Building this query as a
    // single `select(...).from(...)` with paired aliases would mis-parse each
    // alias as another column.
    // Also: `.on(...)` returns the Join node, not the query — `.where()` etc.
    // must be called on the stored query handle.
    const query = select().from('core_shipping_method');
    query.select('core_shipping_method.uuid', 'method_uuid');
    query.select('core_shipping_method.name', 'method_name');
    query.select('core_shipping_method.sort_order', 'method_sort_order');
    query.select(
      'core_shipping_method.default_carrier_code',
      'default_carrier_code'
    );
    query.select(
      'core_shipping_method.default_service_code',
      'default_service_code'
    );
    query.select('core_shipping_method_rate.cost', 'cost');
    query.select('core_shipping_method_rate.condition_type', 'condition_type');
    query.select('core_shipping_method_rate.min', 'min');
    query.select('core_shipping_method_rate.max', 'max');
    query.select('core_shipping_method_rate.price_based_cost', 'price_based_cost');
    query.select('core_shipping_method_rate.weight_based_cost', 'weight_based_cost');
    query
      .innerJoin('core_shipping_method_rate')
      .on(
        'core_shipping_method_rate.method_id',
        '=',
        'core_shipping_method.core_shipping_method_id'
      );
    query
      .where(
        'core_shipping_method_rate.zone_id',
        '=',
        ctx.zone.shipping_zone_id
      )
      .and('core_shipping_method_rate.is_enabled', '=', true)
      .and('core_shipping_method.is_enabled', '=', true);
    query.orderBy('core_shipping_method.sort_order', 'ASC');

    const rates = (await query.execute(pool)) as RateRow[];

    const methods: ShippingMethod[] = [];
    for (const rate of rates) {
      const min = rate.min !== null ? toNumber(rate.min) : null;
      const max = rate.max !== null ? toNumber(rate.max) : null;
      if (
        !passesCondition(
          rate.condition_type,
          min,
          max,
          ctx.totalValue,
          ctx.totalWeight
        )
      ) {
        continue;
      }
      const cost = computeCost(rate, ctx.totalValue, ctx.totalWeight);
      if (cost === null) continue;
      methods.push({
        code: rate.method_uuid,
        name: rate.method_name,
        cost,
        // Carry the merchant's per-method default-carrier and service-code
        // hints into the snapshot. NewShipmentDialog uses the carrier to
        // pre-select the dropdown; createShipment.buildCreateLabelInput
        // reads the service code and writes it onto
        // `CreateLabelInput.serviceCode` so the label gets bought for the
        // exact service the customer paid for. Customer-facing surfaces
        // NEVER display either — both are fulfillment metadata.
        carrier: rate.default_carrier_code ?? undefined,
        serviceCode: rate.default_service_code ?? undefined
      });
    }
    return methods;
  }
};
