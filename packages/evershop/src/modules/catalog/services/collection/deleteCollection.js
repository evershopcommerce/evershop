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

async function deleteCollectionData(uuid, connection) {
  await del('collection').where('uuid', '=', uuid).execute(connection);
}
/**
 * Delete collection service. This service will delete a collection with all related data
 * @param {String} uuid
 * @param {Object} context
 */
async function deleteCollection(uuid, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const query = select().from('collection');
    const collection = await query.where('uuid', '=', uuid).load(connection);

    if (!collection) {
      throw new Error('Invalid collection id');
    }
    await hookable(deleteCollectionData, {
      ...context,
      connection,
      collection
    })(uuid, connection);
    await commit(connection);
    return collection;
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
  const collection = await hookable(deleteCollection, context)(uuid, context);
  return collection;
};
