const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { setContextValue } = require('../../../../graphql/services/contextHelper');

module.exports = async (request, response, delegate, next) => {
  try {
    const query = select();
    query.from('attribute')
    query.andWhere('attribute.`attribute_id`', '=', request.params.id);
    const attribute = await query.load(pool);

    if (attribute === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'attributeId', attribute.attribute_id);
      setContextValue(request, 'pageInfo', {
        title: attribute.name,
        description: attribute.name
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
