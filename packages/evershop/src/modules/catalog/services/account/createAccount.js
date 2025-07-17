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
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');
const { getAjv } = require('../../../base/services/getAjv');
const accountDataSchema = require('./accountDataSchema.json');

async function validateAccountDataBeforeInsert(data, context, connection) {
  const ajv = getAjv();
  const jsonSchema = getValueSync(
    'createAccountDataJsonSchema',
    accountDataSchema
  );
  const validate = ajv.compile(jsonSchema);

  // Validate each element
  const errors = [];

  // Validate each element and collect errors
  data.forEach((element, index) => {
    const valid = validate(element);
    if (!valid) {
      errors.push({
        index,
        errors: validate.errors.map(err => err.message) // Collect all error messages for this element
      });
    }
  });

  if (errors.length > 0) {
    throw new Error(JSON.stringify(errors, null, 2));
  } else {
    return data;
  }
}

async function insertAccountData(data, connection, context) {
  const accounts = [];
  data.forEach(async (element, index) => {
    element.product_id = context.productId;
    element.status = 'active';
    const account = await insert('account').given(element).execute(connection);
    if (!account) {
      throw new Error(`Failed to insert account at index ${index}`);
    } else {
      accounts.push(account);
    }
  }); 

  return {
    ...accounts
  };
}

/**
 * Create category service. This service will create a category with all related data
 * @param {Object} data
 * @param {Object} context
 */
async function createAccount(data, context, connection) {
  try {
    let accountData = await getValue('accountDataBeforeCreate', data);
    accountData = JSON.parse(accountData.sendData);
    // Validate account data
    validateAccountDataBeforeInsert(accountData, context, connection);
    console.log('accountData', accountData);
    // Insert account data
    const connection1 = await getConnection();
    await startTransaction(connection1);
    const account = await hookable(insertAccountData, context)(
      accountData,
      connection1,
      context
    );
    commit(connection1);
    return account;
  } catch (e) {
    await rollback(connection1);
    throw e;
  }
}

module.exports = async (data, context) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const connection = await getConnection();
  await startTransaction(connection);
  const query = select().from('product');
  const product = await query.where('uuid', '=', context.productUuid).load(connection);
  if (!product) {
    throw new Error('Requested product not found');
  }
  context.productId = product.product_id;
  commit(connection);
  const account = await hookable(createAccount, context)(data, context, connection);
  return account;
};
