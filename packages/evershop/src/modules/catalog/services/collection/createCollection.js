const { hookable } = require('@evershop/evershop/src/lib/util/hookable');
const {
  getValueSync,
  getValue
} = require('@evershop/evershop/src/lib/util/registry');
const {
  startTransaction,
  commit,
  rollback,
  insert
} = require('@evershop/postgres-query-builder');
const {
  getConnection
} = require('@evershop/evershop/src/lib/postgres/connection');
const { getAjv } = require('../../../base/services/getAjv');
const collectionDataSchema = require('./collectionDataSchema.json');

function validateCollectionDataBeforeInsert(data) {
  const ajv = getAjv();
  collectionDataSchema.required = ['name', 'description', 'code'];
  const jsonSchema = getValueSync(
    'createCollectionDataJsonSchema',
    collectionDataSchema
  );
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    return data;
  } else {
    throw new Error(validate.errors[0].message);
  }
}

async function insertCollectionData(data, connection) {
  const collection = await insert('collection').given(data).execute(connection);
  return collection;
}

/**
 * Create collection service. This service will create a collection with all related data
 * @param {Object} data
 * @param {Object} context
 */
async function createCollection(data, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  const hookContext = {connection, ...context};
  try {
    const collectionData = await getValue('collectionDataBeforeCreate', data);
    // Validate collection data
    validateCollectionDataBeforeInsert(collectionData);

    // Insert collection data
    const collection = await hookable(insertCollectionData, hookContext)(
      collectionData,
      connection
    );

    await commit(connection);
    return collection;
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
  const collection = await hookable(createCollection)(data, context);
  return collection;
};
