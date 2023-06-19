const {
  commit,
  rollback,
  select
} = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const {
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const promises = [];
  Object.keys(delegate).forEach((id) => {
    // Check if middleware is async
    if (delegate[id] instanceof Promise) {
      promises.push(delegate[id]);
    }
  });
  const result = await delegate.createCategory;
  const connection = await delegate.getConnection;
  const results = await Promise.allSettled(promises);
  const rejected = results.find((r) => r.status === 'rejected');
  if (!rejected) {
    await commit(connection);
    // Load the created category
    const query = select().from('category');
    query
      .leftJoin('category_description')
      .on(
        '"category_description".category_description_category_id',
        '=',
        '"category".category_id'
      );

    const category = await query
      .where('category_id', '=', result.insertId)
      .load(pool);
    response.status(OK);
    response.json({
      data: {
        ...category,
        links: [
          {
            rel: 'categoryGrid',
            href: buildUrl('categoryGrid'),
            action: 'GET',
            types: ['text/xml']
          },
          {
            rel: 'view',
            href: buildUrl('categoryView', { uuid: category.uuid }),
            action: 'GET',
            types: ['text/xml']
          },
          {
            rel: 'edit',
            href: buildUrl('categoryEdit', { id: category.uuid }),
            action: 'GET',
            types: ['text/xml']
          }
        ]
      }
    });
  } else {
    await rollback(connection);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      data: null,
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: rejected.reason.message
      }
    });
  }
};
