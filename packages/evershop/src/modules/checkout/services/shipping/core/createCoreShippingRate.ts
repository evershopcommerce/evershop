import { insert, select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import {
  hookable,
  hookAfter,
  hookBefore
} from '../../../../../lib/util/hookable.js';
import type { CoreShippingMethodRateRow } from '../../../../../types/db/index.js';

/**
 * Full rate state for a Core method in a zone. The admin form always submits
 * the complete state (one of flat `cost` / `price_based_cost` /
 * `weight_based_cost`, with the others nulled, plus an optional condition).
 */
export interface CoreShippingRateData {
  is_enabled?: boolean;
  cost?: string | number | null;
  condition_type?: 'price' | 'weight' | null;
  min?: string | number | null;
  max?: string | number | null;
  price_based_cost?: Array<Record<string, unknown>> | null;
  weight_based_cost?: Array<Record<string, unknown>> | null;
}

export interface CreateCoreShippingRateInput extends CoreShippingRateData {
  /** Numeric `core_shipping_method.core_shipping_method_id`. */
  method_id: number;
  /** Numeric `shipping_zone.shipping_zone_id`. */
  zone_id: number;
}

async function createCoreShippingRate(
  data: CreateCoreShippingRateInput
): Promise<CoreShippingMethodRateRow> {
  const inserted = await insert('core_shipping_method_rate')
    .given({
      method_id: data.method_id,
      zone_id: data.zone_id,
      is_enabled: data.is_enabled ?? true,
      cost: data.cost ?? null,
      condition_type: data.condition_type ?? null,
      min: data.min ?? null,
      max: data.max ?? null,
      price_based_cost: data.price_based_cost ?? null,
      weight_based_cost: data.weight_based_cost ?? null
    })
    .execute(pool);

  const row = (await select()
    .from('core_shipping_method_rate')
    .where('core_shipping_method_rate_id', '=', inserted.insertId)
    .load(pool)) as CoreShippingMethodRateRow;
  return row;
}

/**
 * Create a per-(method, zone) rate for the Core provider. The caller validates
 * that the method and zone exist; the table enforces UNIQUE(method_id, zone_id)
 * so a duplicate pair throws.
 *
 * Hookable as `createCoreShippingRate`.
 */
export default async (
  data: CreateCoreShippingRateInput,
  context: Record<string, unknown> = {}
): Promise<CoreShippingMethodRateRow> =>
  hookable(createCoreShippingRate, context)(data);

export function hookBeforeCreateCoreShippingRate(
  callback: (
    this: Record<string, unknown>,
    ...args: [data: CreateCoreShippingRateInput]
  ) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('createCoreShippingRate', callback, priority);
}

export function hookAfterCreateCoreShippingRate(
  callback: (
    this: Record<string, unknown>,
    ...args: [
      result: CoreShippingMethodRateRow,
      data: CreateCoreShippingRateInput
    ]
  ) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('createCoreShippingRate', callback, priority);
}
