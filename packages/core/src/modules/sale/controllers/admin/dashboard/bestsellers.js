const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { buildUrl } = require('../../../../../lib/router/buildUrl');

module.exports = async function bestsellers(request, response) {
  try {
    const query = select();
    query.from('product').leftJoin('product_description').on('product.`product_id`', '=', 'product_description.`product_description_product_id`');
    query.leftJoin('order_item').on('product.`product_id`', '=', 'order_item.`product_id`');
    query.select('product.`product_id`', 'product_id')
      .select('order_item.`product_id`')
      .select('image')
      .select('name')
      .select('price')
      .select('SUM(order_item.`qty`)', 'qty')
      .select('SUM(order_item.`product_id`)', 'sum')
      .where('order_item_id', 'IS NOT', null);
    query.groupBy('order_item.`product_id`')
      .orderBy('qty', 'DESC')
      .limit(0, 5);
    const results = await query.execute(pool);
    response.context.bestsellers = results.map((p) => {
      const product = { ...p, editUrl: buildUrl('productEdit', { id: parseInt(p.product_id, 10) }) };
      if (p.image) {
        product.imageUrl = buildUrl('adminStaticAsset', [p.image]);
      }
      return product;
    });
  } catch (error) {
    throw new Error(error);
  }
};
