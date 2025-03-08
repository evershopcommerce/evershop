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

async function deleteCategoryData(uuid, connection) {
  await del('category').where('uuid', '=', uuid).execute(connection);
}
/**
 * Delete category service. This service will delete a category with all related data
 * @param {String} uuid
 * @param {Object} context
 */
async function deleteCategory(uuid, context) {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
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
    await hookable(deleteCategoryData, { ...context, connection, category })(
      uuid,
      connection
    );

    await commit(connection);
    return category;
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
  const category = await hookable(deleteCategory, context)(uuid, context);
  return category;
};
