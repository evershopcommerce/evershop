const { hookable } = require('@evershop/evershop/src/lib/util/hookable');
const {
  getValueSync,
  getValue
} = require('@evershop/evershop/src/lib/util/registry');
const {
  startTransaction,
  commit,
  rollback,
  insert,
  select
} = require('@evershop/postgres-query-builder');
const {
  getConnection,
  pool
} = require('@evershop/evershop/src/lib/postgres/connection');
const {
  hashPassword,
  verifyPassword
} = require('@evershop/evershop/src/lib/util/passwordHelper');
const { emit } = require('@evershop/evershop/src/lib/event/emitter');
const { getAjv } = require('../../../base/services/getAjv');
const customerDataSchema = require('./customerDataSchema.json');

function validateCustomerDataBeforeInsert(data) {
  const ajv = getAjv();
  customerDataSchema.required = ['email', 'password', 'full_name'];
  const jsonSchema = getValueSync(
    'createCustomerDataJsonSchema',
    customerDataSchema
  );
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    // Validate password
    const { password } = data;
    verifyPassword(password);
    return data;
  } else {
    throw new Error(validate.errors[0].message);
  }
}

async function insertCustomerData(data, connection) {
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
async function createCustomer(data, context) {
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
    const hashedPassword = hashPassword(password);
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

module.exports = async (data, context) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const customer = await hookable(createCustomer, context)(data, context);
  return customer;
};
