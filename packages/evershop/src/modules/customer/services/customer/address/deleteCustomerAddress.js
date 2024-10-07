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

async function deleteCustomerAddressData(uuid, connection) {
  await del('customer_address').where('uuid', '=', uuid).execute(connection);
}
/**
 * Delete customer address service. This service will delete a customer address with all related data
 * @param {String} uuid
 * @param {Object} context
 */
async function deleteCustomerAddress(uuid, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const query = select().from('customer_address');
    const address = await query.where('uuid', '=', uuid).load(connection);

    if (!address) {
      throw new Error('Invalid address id');
    }
    await hookable(deleteCustomerAddressData, {
      ...context,
      connection,
      address
    })(uuid, connection);

    await commit(connection);
    return address;
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
  const customer = await hookable(deleteCustomerAddress, context)(
    uuid,
    context
  );
  return customer;
};
