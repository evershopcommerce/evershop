import {
  commit,
  del,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';

async function deleteCustomerData(uuid, connection) {
  await del('customer').where('uuid', '=', uuid).execute(connection);
}
/**
 * Delete customer service. This service will delete a customer with all related data
 * @param {String} uuid
 * @param {Object} context
 */
async function deleteCustomer(uuid, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const query = select().from('customer');
    const customer = await query.where('uuid', '=', uuid).load(connection);

    if (!customer) {
      throw new Error('Invalid customer id');
    }
    await hookable(deleteCustomerData, { ...context, connection, customer })(
      uuid,
      connection
    );

    await commit(connection);
    // Delete password from customer object
    delete customer.password;
    return customer;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

export default async (uuid, context) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const customer = await hookable(deleteCustomer, context)(uuid, context);
  return customer;
};
