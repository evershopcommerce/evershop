import {
  commit,
  del,
  PoolClient,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../lib/util/hookable.js';
import type { CouponRow } from '../../../../types/db/index.js';
import type { CouponData } from './createCoupon.js';

async function deleteCouponData(
  uuid: string,
  connection: PoolClient
): Promise<void> {
  await del('coupon').where('uuid', '=', uuid).execute(connection);
}

/**
 * Delete coupon service. This service will delete a coupon with all related data
 * @param {string} uuid
 * @param {Record<string, any>} context
 */
async function deleteCoupon(
  uuid: string,
  context: Record<string, any>
): Promise<CouponRow> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const query = select().from('coupon');
    const coupon = await query.where('uuid', '=', uuid).load(connection);

    if (!coupon) {
      throw new Error('Invalid coupon id');
    }
    await hookable(deleteCouponData, { ...context, coupon, connection })(
      uuid,
      connection
    );
    await commit(connection);
    return coupon;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

export default async (
  uuid: string,
  context: Record<string, any> = {}
): Promise<CouponRow> => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const coupon = await hookable(deleteCoupon, context)(uuid, context);
  return coupon;
};

export function hookBeforeDeleteCouponData(
  callback: (uuid: string, connection: PoolClient) => Promise<void>,
  priority?: number
): void {
  hookBefore('deleteCouponData', callback, priority);
}

export function hookAfterDeleteCouponData(
  callback: (uuid: string, connection: PoolClient) => Promise<void>,
  priority?: number
): void {
  hookAfter('deleteCouponData', callback, priority);
}

export function hookBeforeDeleteCoupon(
  callback: (
    uuid: string,
    context: Record<string, any>
  ) => void | Promise<void>,
  priority?: number
): void {
  hookBefore('deleteCoupon', callback, priority);
}

export function hookAfterDeleteCoupon(
  callback: (
    result: CouponData,
    uuid: string,
    context: Record<string, any>
  ) => void | Promise<void>,
  priority?: number
): void {
  hookAfter('deleteCoupon', callback, priority);
}
