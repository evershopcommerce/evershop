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

/**
 * Delete coupon service. This service will delete a coupon with all related data
 * @param {String} uuid
 * @param {Object} connection
 */
async function deleteCoupon(uuid, connection) {
  const query = select().from('coupon');
  const coupon = await query.where('uuid', '=', uuid).load(connection);

  if (!coupon) {
    throw new Error('Invalid coupon id');
  }
  await del('coupon').where('uuid', '=', uuid).execute(connection);
  return coupon;
}

module.exports = async (uuid, context) => {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const hookContext = {
      connection
    };
    // Make sure the context is either not provided or is an object
    if (context && typeof context !== 'object') {
      throw new Error('Context must be an object');
    }
    // Merge hook context with context
    Object.assign(hookContext, context);
    const coupon = await hookable(deleteCoupon, hookContext)(uuid, connection);
    await commit(connection);
    return coupon;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};
