import { select, update } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import {
  hookable,
  hookAfter,
  hookBefore
} from '../../../../../lib/util/hookable.js';
import type { CoreShippingMethodRateRow } from '../../../../../types/db/index.js';
import type { CoreShippingRateData } from './createCoreShippingRate.js';

async function updateCoreShippingRate(
  uuid: string,
  data: CoreShippingRateData
): Promise<CoreShippingMethodRateRow> {
  // Full-state replace — the admin form always submits every calculation and
  // condition field, with the unused branches nulled.
  await update('core_shipping_method_rate')
    .given({
      is_enabled: data.is_enabled ?? true,
      cost: data.cost ?? null,
      condition_type: data.condition_type ?? null,
      min: data.min ?? null,
      max: data.max ?? null,
      price_based_cost: data.price_based_cost ?? null,
      weight_based_cost: data.weight_based_cost ?? null
    })
    .where('uuid', '=', uuid)
    .execute(pool);

  const row = (await select()
    .from('core_shipping_method_rate')
    .where('uuid', '=', uuid)
    .load(pool)) as CoreShippingMethodRateRow | undefined;
  if (!row) {
    throw new Error('Core shipping rate not found');
  }
  return row;
}

/**
 * Update an existing Core rate, identified by its `uuid`. The caller validates
 * that the rate exists before calling.
 *
 * Hookable as `updateCoreShippingRate`.
 */
export default async (
  uuid: string,
  data: CoreShippingRateData,
  context: Record<string, unknown> = {}
): Promise<CoreShippingMethodRateRow> =>
  hookable(updateCoreShippingRate, context)(uuid, data);

export function hookBeforeUpdateCoreShippingRate(
  callback: (
    this: Record<string, unknown>,
    ...args: [uuid: string, data: CoreShippingRateData]
  ) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('updateCoreShippingRate', callback, priority);
}

export function hookAfterUpdateCoreShippingRate(
  callback: (
    this: Record<string, unknown>,
    ...args: [
      result: CoreShippingMethodRateRow,
      uuid: string,
      data: CoreShippingRateData
    ]
  ) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('updateCoreShippingRate', callback, priority);
}
