const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { setContextValue } = require('../../../../graphql/services/buildContext');

module.exports = async (request, response, stack, next) => {
  try {
    const query = select();
    query.from('product')
      .leftJoin('product_description')
      .on('product.`product_id`', '=', 'product_description.`product_description_product_id`');
    query.where('status', '=', 1);
    query.andWhere('product_description.`url_key`', '=', request.params.url_key);
    const product = await query.load(pool);
    if (product === null) {
      response.status(404);
      next();
    } else {
      setContextValue('productId', product.product_id);
      setContextValue('pageInfo', {
        title: product.meta_title || product.name,
        description: product.meta_description || product.short_description
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
