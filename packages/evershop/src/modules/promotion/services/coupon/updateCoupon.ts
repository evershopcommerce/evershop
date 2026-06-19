import {
  commit,
  PoolClient,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable, hookBefore, hookAfter } from '../../../../lib/util/hookable.js';
import {
  getValue,
  getValueSync
} from '../../../../lib/util/registry.js';
import type { CouponRow } from '../../../../types/db/index.js';
import { getAjv } from '../../../base/services/getAjv.js';
import couponDataSchema from './couponDataSchema.json' with { type: 'json' };
import type { CouponData } from './createCoupon.js';

function validateCouponDataBeforeUpdate(data: Partial<CouponData>): Partial<CouponData> {
  const ajv = getAjv();
  (couponDataSchema as any).required = [];
  const jsonSchema = getValueSync(
    'updateCouponDataJsonSchema',
    couponDataSchema,
    {}
  );
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    return data;
  } else {
    throw new Error(validate.errors[0].message);
  }
}

async function updateCouponData(uuid: string, data: Partial<CouponData>, connection: PoolClient): Promise<CouponRow> {
  const coupon = await select()
    .from('coupon')
    .where('uuid', '=', uuid)
    .load(connection);

  if (!coupon) {
    throw new Error('Requested coupon not found');
  }

  try {
    await update('coupon')
      .given(data)
      .where('uuid', '=', uuid)
      .execute(connection);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }

  const updatedCoupon: CouponRow = await select()
    .from('coupon')
    .where('uuid', '=', uuid)
    .load(connection);

  return updatedCoupon;
}

/**
 * Update coupon service. This service will update a coupon with all related data
 * @param {string} uuid
 * @param {Partial<CouponData>} data
 * @param {Record<string, any>} context
 */
async function updateCoupon(uuid: string, data: Partial<CouponData>, context: Record<string, any>): Promise<CouponRow> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const couponData = await getValue('couponDataBeforeUpdate', data);
    // Validate coupon data
    validateCouponDataBeforeUpdate(couponData);

    // Update coupon data
    const coupon = await hookable(updateCouponData, { ...context, connection })(
      uuid,
      couponData,
      connection
    );

    await commit(connection);
    return coupon;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

export default async (uuid: string, data: Partial<CouponData>, context: Record<string, any> = {}): Promise<CouponRow> => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const coupon = await hookable(updateCoupon, context)(uuid, data, context);
  return coupon;
};

export function hookBeforeUpdateCouponData(
  callback: (uuid: string, data: Partial<CouponData>, connection: PoolClient) => Promise<void>,
  priority?: number
): void {
  hookBefore('updateCouponData', callback, priority);
}

export function hookAfterUpdateCouponData(
  callback: (uuid: string, data: Partial<CouponData>, connection: PoolClient) => Promise<void>,
  priority?: number
): void {
  hookAfter('updateCouponData', callback, priority);
}

export function hookBeforeUpdateCoupon(
  callback: (uuid: string, data: Partial<CouponData>, context: Record<string, any>) => Promise<void>,
  priority?: number
): void {
  hookBefore('updateCoupon', callback, priority);
}

export function hookAfterUpdateCoupon(
  callback: (uuid: string, data: Partial<CouponData>, context: Record<string, any>) => Promise<void>,
  priority?: number
): void {
  hookAfter('updateCoupon', callback, priority);
}
