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
  const result = await delegate.createPage;
  const connection = await delegate.getConnection;
  try {
    await Promise.all(promises);
    await commit(connection);

    // Load the updated page
    const query = select().from('cms_page');
    query
      .leftJoin('cms_page_description')
      .on(
        'cms_page_description.cms_page_description_cms_page_id',
        '=',
        'cms_page.cms_page_id'
      );

    const page = await query
      .where('cms_page_id', '=', result.insertId)
      .load(pool);

    response.status(OK);
    response.json({
      data: {
        ...page,
        links: [
          {
            rel: 'cmsPageGrid',
            href: buildUrl('cmsPageGrid'),
            action: 'GET',
            types: ['text/xml']
          },
          {
            rel: 'edit',
            href: buildUrl('cmsPageEdit', { id: page.uuid }),
            action: 'GET',
            types: ['text/xml']
          },
          {
            rel: 'view',
            href: buildUrl('cmsPageView', { url_key: page.url_key }),
            action: 'GET',
            types: ['text/xml']
          }
        ]
      }
    });
  } catch (error) {
    await rollback(connection);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: error.message
      }
    });
  }
};
