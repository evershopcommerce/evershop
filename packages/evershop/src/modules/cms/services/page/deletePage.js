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
 * Delete page service. This service will delete a page with all related data
 * @param {String} uuid
 * @param {Object} connection
 */
async function deletePage(uuid, connection) {
  const query = select().from('cms_page');
  query
    .leftJoin('cms_page_description')
    .on(
      'cms_page_description.page_description_cms_page_id',
      '=',
      'cms_page.cms_page_id'
    );

  const page = await query.where('uuid', '=', uuid).load(connection);

  if (!page) {
    throw new Error('Invalid page id');
  }
  await del('cms_page').where('uuid', '=', uuid).execute(connection);
  return page;
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
    const collection = await hookable(deletePage, hookContext)(
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
