import {
  commit,
  insert,
  PoolClient,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { JSONSchemaType } from 'ajv';
import { emit } from '../../../../lib/event/emitter.js';
import {
  getConnection,
  pool
} from '../../../../lib/postgres/connection.js';
import { hookable } from '../../../../lib/util/hookable.js';
import {
  hashPassword,
  verifyPassword
} from '../../../../lib/util/passwordHelper.js';
import {
  getValue,
  getValueSync
} from '../../../../lib/util/registry.js';
import { getAjv } from '../../../base/services/getAjv.js';
import customerDataSchema from './customerDataSchema.json' with { type: 'json' };

export type CustomerData = {
  email?: string,
  full_name?: string,
  password?: string,
  group_id?: number,
  status?: number,
  [key: string]: unknown
};

function validateCustomerDataBeforeInsert(data: CustomerData) {
  const ajv = getAjv();
  (customerDataSchema as JSONSchemaType<any>).required = ['email', 'password', 'full_name'];
  const jsonSchema = getValueSync(
    'createCustomerDataJsonSchema',
    customerDataSchema,
    {}
  );
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    // Validate password
    const { password } = data;
    verifyPassword(password || '');
    return data;
  } else {
    throw new Error(validate.errors[0].message);
  }
}

async function insertCustomerData(data: CustomerData, connection: PoolClient) {
  const customer = await insert('customer').given(data).execute(connection);
  // Delete password from customer object
  delete customer.password;
  return customer;
}

/**
 * Create customer service. This service will create a customer with all related data
 * @param {Object} data
 * @param {Object} context
 */
async function createCustomer(data: CustomerData, context: Record<string, unknown> = {}) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const customerData = await getValue(
      'customerDataBeforeCreate',
      data,
      context
    );
    // Validate customer data
    validateCustomerDataBeforeInsert(customerData);
    const { email, password } = customerData;
    // Hash the password
    const hashedPassword = hashPassword(password || '');
    // Check if email is already used
    const existingCustomer = await select()
      .from('customer')
      .where('email', '=', email)
      .load(pool);

    if (existingCustomer) {
      throw new Error('Email is already used');
    }

    customerData.status =
      customerData.status !== undefined ? customerData.status : 1;
    customerData.password = hashedPassword;
    customerData.group_id =
      customerData.group_id !== undefined ? customerData.group_id : 1;
    // Insert customer data
    const customer = await hookable(insertCustomerData, {
      ...context,
      connection
    })(customerData, connection);

    // If status = 1, Emit event customer_registered
    // In case of status = 0, the custom extension will need to emit the event
    if (parseInt(customer.status, 10) === 1) {
      await emit('customer_registered', customer);
    }

    await commit(connection);
    return customer;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Create customer service. This service will create a customer with all related data
 * @param {Object} data
 * @param {Object} context
 */
export default async (data: CustomerData, context: Record<string, unknown> ): Promise<CustomerData> => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const customer = await hookable(createCustomer, context)(data, context);
  return customer;
};
