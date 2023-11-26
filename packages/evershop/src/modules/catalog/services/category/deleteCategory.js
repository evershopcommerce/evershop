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
 * Delete category service. This service will delete a category with all related data
 * @param {String} uuid
 * @param {Object} connection
 */
async function deleteCategory(uuid, connection) {
  const query = select().from('category');
  query
    .leftJoin('category_description')
    .on(
      'category_description.category_description_category_id',
      '=',
      'category.category_id'
    );

  const category = await query.where('uuid', '=', uuid).load(connection);

  if (!category) {
    throw new Error('Invalid category id');
  }
  await del('category').where('uuid', '=', uuid).execute(connection);
  return category;
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
    const collection = await hookable(deleteCategory, hookContext)(
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
