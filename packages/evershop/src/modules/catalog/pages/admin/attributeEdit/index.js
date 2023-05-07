const { select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  setContextValue
} = require('../../../../graphql/services/contextHelper');

module.exports = async (request, response, delegate, next) => {
  try {
    const query = select();
    query.from('attribute');
    query.andWhere('attribute.uuid', '=', request.params.id);
    const attribute = await query.load(pool);

    if (attribute === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'attributeId', attribute.attribute_id);
      setContextValue(request, 'attributeUuid', attribute.uuid);
      setContextValue(request, 'pageInfo', {
        title: attribute.attribute_name,
        description: attribute.attribute_name
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
