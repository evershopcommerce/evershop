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
  const uuid = request.params.id;
  const connection = await delegate.getConnection;
  const results = await Promise.allSettled(promises);
  const rejected = results.find((r) => r.status === 'rejected');
  if (!rejected) {
    await commit(connection);
    response.status(OK);
    const attribute = await select()
      .from('attribute')
      .where('uuid', '=', uuid)
      .load(pool);

    response.json({
      data: {
        ...attribute,
        links: [
          {
            rel: 'attributeGrid',
            href: buildUrl('attributeGrid'),
            action: 'GET',
            types: ['text/xml']
          }
        ]
      }
    });
  } else {
    await rollback(connection);
    response.status(
      response.statusCode !== 200 ? response.statusCode : INTERNAL_SERVER_ERROR
    );
    response.json({
      error: {
        status:
          response.statusCode !== 200
            ? response.statusCode
            : INTERNAL_SERVER_ERROR,
        message: rejected.reason.message
      }
    });
  }
};
