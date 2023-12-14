const { hookable } = require('@evershop/evershop/src/lib/util/hookable');
const {
  getValueSync,
  getValue
} = require('@evershop/evershop/src/lib/util/registry');
const {
  startTransaction,
  commit,
  rollback,
  update,
  select
} = require('@evershop/postgres-query-builder');
const {
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');
const { getAjv } = require('../../../base/services/getAjv');
const couponDataSchema = require('./couponDataSchema.json');

function validateCouponDataBeforeInsert(data) {
  const ajv = getAjv();
  couponDataSchema.required = [];
  const jsonSchema = getValueSync(
    'updateCouponDataJsonSchema',
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

async function updateCouponData(uuid, data, connection) {
  const coupon = await select()
    .from('coupon')
    .where('uuid', '=', uuid)
    .load(connection);

  if (!coupon) {
    throw new Error('Requested coupon not found');
  }

  try {
    const newCoupon = await update('coupon')
      .given(data)
      .where('uuid', '=', uuid)
      .execute(connection);

    return newCoupon;
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    } else {
      return coupon;
    }
  }
}

/**
 * Update coupon service. This service will update a coupon with all related data
 * @param {Object} data
 * @param {Object} context
 */
async function updateCoupon(uuid, data, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const couponData = await getValue('couponDataBeforeUpdate', data);
    // Validate coupon data
    validateCouponDataBeforeInsert(couponData);

    // Insert coupon data
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

module.exports = async (uuid, data, context) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const coupon = await hookable(updateCoupon, context)(uuid, data, context);
  return coupon;
};
