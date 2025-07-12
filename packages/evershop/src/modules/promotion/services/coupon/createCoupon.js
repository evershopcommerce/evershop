import {
  commit,
  insert,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';
import {
  getValue,
  getValueSync
} from '../../../../lib/util/registry.js';
import { getAjv } from '../../../base/services/getAjv.js';
import couponDataSchema from './couponDataSchema.json' with { type: 'json' };

function validateCouponDataBeforeInsert(data) {
  const ajv = getAjv();
  couponDataSchema.required = [
    'coupon',
    'status',
    'discount_amount',
    'discount_type'
  ];
  const jsonSchema = getValueSync(
    'createCouponDataJsonSchema',
    couponDataSchema
  );
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    return data;
  } else {
    throw new Error(validate.errors[0].message);
  }
}

async function insertCouponData(data, connection) {
  const coupon = await insert('coupon').given(data).execute(connection);
  return coupon;
}

/**
 * Create coupon service. This service will create a coupon with all related data
 * @param {Object} data
 * @param {Object} context
 */
async function createCoupon(data, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const couponData = await getValue('couponDataBeforeCreate', data);
    // Validate coupon data
    validateCouponDataBeforeInsert(couponData);

    // Insert coupon data
    const coupon = await hookable(insertCouponData, { ...context, connection })(
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

export default async (data, context) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const coupon = await hookable(createCoupon, context)(data, context);
  return coupon;
};
