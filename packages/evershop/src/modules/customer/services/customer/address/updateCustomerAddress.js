const { hookable } = require('@evershop/evershop/src/lib/util/hookable');
const { getValue } = require('@evershop/evershop/src/lib/util/registry');
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
const { validateAddress } = require('./addressValidator');

async function updateCustomerAddressData(uuid, data, connection) {
  const query = select().from('customer_address');
  const address = await query.where('uuid', '=', uuid).load(connection);
  try {
    const newAddress = await update('customer_address')
      .given(data)
      .where('uuid', '=', uuid)
      .execute(connection);
    if (newAddress.is_default) {
      await update('customer_address')
        .given({
          is_default: 0
        })
        .where('customer_id', '=', newAddress.customer_id)
        .and('uuid', '<>', newAddress.uuid)
        .execute(connection);
    }
    Object.assign(address, newAddress);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }
  return address;
}

/**
 * Update customer address service. This service will update a customer address with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 */
async function updateCustomerAddress(uuid, data, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const addressData = await getValue('customerDataBeforeUpdate', data);
    const query = select().from('customer_address');
    const currentAddress = await query
      .where('uuid', '=', uuid)
      .load(connection);
    if (!currentAddress) {
      throw new Error('Requested address not found');
    }
    // Remove null values from the current address
    Object.keys(currentAddress).forEach((key) => {
      if (currentAddress[key] === null) {
        delete currentAddress[key];
      }
    });
    // Validate address data
    validateAddress({
      ...currentAddress,
      ...addressData
    });
    // Update address data
    const address = await hookable(updateCustomerAddressData, {
      ...context,
      connection
    })(uuid, addressData, connection);

    await commit(connection);
    return address;
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
  const address = await hookable(updateCustomerAddress, context)(
    uuid,
    data,
    context
  );
  return address;
};
