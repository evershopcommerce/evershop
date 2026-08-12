import { del, select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import {
  hookable,
  hookAfter,
  hookBefore
} from '../../../../../lib/util/hookable.js';
import type { CoreShippingMethodRateRow } from '../../../../../types/db/index.js';

async function deleteCoreShippingRate(
  uuid: string
): Promise<CoreShippingMethodRateRow> {
  const row = (await select()
    .from('core_shipping_method_rate')
    .where('uuid', '=', uuid)
    .load(pool)) as CoreShippingMethodRateRow | undefined;
  if (!row) {
    throw new Error('Core shipping rate not found');
  }
  await del('core_shipping_method_rate').where('uuid', '=', uuid).execute(pool);
  return row;
}

/**
 * Delete a Core method's per-zone rate, identified by its `uuid`. The method
 * itself stays; the method simply stops being offered in that zone until a new
 * rate is created. Returns the deleted row. The caller validates existence.
 *
 * Hookable as `deleteCoreShippingRate`.
 */
export default async (
  uuid: string,
  context: Record<string, unknown> = {}
): Promise<CoreShippingMethodRateRow> =>
  hookable(deleteCoreShippingRate, context)(uuid);

export function hookBeforeDeleteCoreShippingRate(
  callback: (
    this: Record<string, unknown>,
    ...args: [uuid: string]
  ) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('deleteCoreShippingRate', callback, priority);
}

export function hookAfterDeleteCoreShippingRate(
  callback: (
    this: Record<string, unknown>,
    ...args: [result: CoreShippingMethodRateRow, uuid: string]
  ) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('deleteCoreShippingRate', callback, priority);
}
