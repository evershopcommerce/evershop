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

/**
 * Delete collection service. This service will delete a collection with all related data
 * @param {String} uuid
 * @param {Object} connection
 */
async function deleteCollection(uuid, connection) {
  const query = select().from('collection');
  const collection = await query.where('uuid', '=', uuid).load(connection);

  if (!collection) {
    throw new Error('Invalid collection id');
  }
  await del('collection').where('uuid', '=', uuid).execute(connection);
  return collection;
}

module.exports = async (uuid, context) => {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const hookContext = {
      connection
    };
    // Make sure the context is either not provided or is an object
    if (context && typeof context !== 'object') {
      throw new Error('Context must be an object');
    }
    // Merge hook context with context
    Object.assign(hookContext, context);
    const collection = await hookable(deleteCollection, hookContext)(
      uuid,
      connection
    );
    await commit(connection);
    return collection;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};
