const { hookable } = require('@evershop/evershop/src/lib/util/hookable');
const {
  startTransaction,
  commit,
  rollback,
  select,
  del
} = require('@evershop/postgres-query-builder');
const {
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');

async function deleteCouponData(uuid, connection) {
  await del('coupon').where('uuid', '=', uuid).execute(connection);
}

/**
 * Delete coupon service. This service will delete a coupon with all related data
 * @param {String} uuid
 * @param {Object} context
 */
async function deleteCoupon(uuid, context) {
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

module.exports = async (uuid, context) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const coupon = await hookable(deleteCoupon, context)(uuid, context);
  return coupon;
};
