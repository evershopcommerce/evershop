const { select } = require('@nodejscart/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { assign } = require('../../../../../lib/util/assign');

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
      assign(response.context, {
        product: JSON.parse(JSON.stringify(product)),
        metaTitle: product.meta_title || product.name,
        metaDescription: product.meta_description || product.short_description
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
