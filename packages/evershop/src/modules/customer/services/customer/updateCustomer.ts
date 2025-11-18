import {
  commit, 
  PoolClient, 
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { JSONSchemaType } from 'ajv';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';
import {
  getValue,
  getValueSync
} from '../../../../lib/util/registry.js';
import { getAjv } from '../../../base/services/getAjv.js';
import { CustomerData } from './createCustomer.js';
import customerDataSchema from './customerDataSchema.json' with { type: 'json' };

function validateCustomerDataBeforeInsert(data: CustomerData) {
  const ajv = getAjv();
  (customerDataSchema as JSONSchemaType<any>).required = [];
  const jsonSchema = getValueSync(
    'updateCustomerDataJsonSchema',
    customerDataSchema,
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

async function updateCustomerData(uuid: string, data: CustomerData, connection: PoolClient) {
  const query = select().from('customer');
  const customer = await query.where('uuid', '=', uuid).load(connection);
  if (!customer) {
    throw new Error('Requested customer not found');
  }

  try {
    const newCustomer = await update('customer')
      .given(data)
      .where('uuid', '=', uuid)
      .execute(connection);
    Object.assign(customer, newCustomer);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }

  // Delete password from customer object
  delete customer.password;
  return customer;
}

/**
 * Update customer service. This service will update a customer with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 */
async function updateCustomer(uuid: string, data: CustomerData, context: Record<string, any>) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const customerData = await getValue('customerDataBeforeUpdate', data);
    // Validate customer data
    validateCustomerDataBeforeInsert(customerData);

    // Do not allow to update password here. Use changePassword service instead
    delete customerData.password;
    // Update customer data
    const customer = await hookable(updateCustomerData, {
      ...context,
      connection
    })(uuid, customerData, connection);

    await commit(connection);
    return customer;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Update customer service. This service will update a customer with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 */
export default async (uuid: string, data: CustomerData, context: Record<string, any>): Promise<CustomerData> => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const customer = await hookable(updateCustomer, context)(uuid, data, context);
  return customer;
};
