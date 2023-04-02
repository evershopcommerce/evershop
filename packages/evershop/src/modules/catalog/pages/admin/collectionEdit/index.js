const { select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  setContextValue
} = require('../../../../graphql/services/contextHelper');

module.exports = async (request, response, delegate, next) => {
  try {
    const query = select();
    query.from('collection');
    query.andWhere('collection.uuid', '=', request.params.id);
    const collection = await query.load(pool);
    if (collection === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'collectionCode', collection.code);
      setContextValue(request, 'collectionUuid', collection.uuid);
      setContextValue(request, 'pageInfo', {
        title: collection.name,
        description: collection.description
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
