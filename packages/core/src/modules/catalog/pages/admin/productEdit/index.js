const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { setContextValue } = require('../../../../graphql/services/contextHelper');

module.exports = async (request, response, delegate, next) => {
  try {
    const query = select();
    query.from('product')
    query.andWhere('product.`product_id`', '=', request.params.id);
    query.leftJoin('product_description').on('product_description.`product_description_product_id`', '=', 'product.`product_id`')
    const product = await query.load(pool);

    if (product === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'productId', product.product_id);
      setContextValue(request, 'pageInfo', {
        title: product.meta_title || product.name,
        description: product.meta_description || product.short_description
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
