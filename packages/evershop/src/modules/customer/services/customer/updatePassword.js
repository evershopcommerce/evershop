const { hookable } = require('@evershop/evershop/src/lib/util/hookable');
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
const {
  hashPassword,
  verifyPassword
} = require('@evershop/evershop/src/lib/util/passwordHelper');

async function updateCustomerPassword(customerId, hash, connection) {
  await update('customer')
    .given({
      password: hash
    })
    .where('customer_id', '=', customerId)
    .execute(connection);
}

/**
 * Update customer password service.
 * @param {Number} customerId
 * @param {String} newPassword
 * @param {Object} context
 */
async function updatePassword(customerId, newPassword, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const query = select().from('customer');
    const customer = await query
      .where('customer_id', '=', customerId)
      .load(connection);
    if (!customer) {
      throw new Error('Requested customer not found');
    }
    // Verify password
    verifyPassword(newPassword);
    // Hash password
    const hash = hashPassword(newPassword);
    // Update customer password
    await hookable(updateCustomerPassword, {
      ...context,
      connection
    })(customerId, hash, connection);

    await commit(connection);
    return customer;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

module.exports = async (customerId, password, context) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  await hookable(updatePassword, context)(customerId, password, context);
  return true;
};
