const { hookable } = require('@evershop/evershop/src/lib/util/hookable');
const {
  getValueSync,
  getValue
} = require('@evershop/evershop/src/lib/util/registry');
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
const { getAjv } = require('../../../base/services/getAjv');
const collectionDataSchema = require('./collectionDataSchema.json');

function validateCollectionDataBeforeInsert(data) {
  const ajv = getAjv();
  collectionDataSchema.required = [];
  const jsonSchema = getValueSync(
    'updateCollectionDataJsonSchema',
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

async function updateCollectionData(uuid, data, connection) {
  const collection = await select()
    .from('collection')
    .where('uuid', '=', uuid)
    .load(connection);

  if (!collection) {
    throw new Error('Requested collection not found');
  }

  try {
    const newCollection = await update('collection')
      .given(data)
      .where('uuid', '=', uuid)
      .execute(connection);

    return newCollection;
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    } else {
      return collection;
    }
  }
}

/**
 * Update collection service. This service will update a collection with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 */
async function updateCollection(uuid, data, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  const hookContext = {connection, ...context};
  try {
    const collectionData = await getValue('collectionDataBeforeUpdate', data);
    // Validate collection data
    validateCollectionDataBeforeInsert(collectionData);

    // Insert collection data
    const collection = await hookable(updateCollectionData, hookContext)(
      uuid,
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

module.exports = async (uuid, data, context) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  // Merge hook context with context
  const collection = await hookable(updateCollection, context)(
    uuid,
    data,
    context
  );
  return collection;
};
