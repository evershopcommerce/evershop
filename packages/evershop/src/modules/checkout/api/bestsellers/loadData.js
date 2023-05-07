const { select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const query = select();
  query
    .from('product')
    .innerJoin('product_description')
    .on(
      'product.product_id',
      '=',
      'product_description.product_description_product_id'
    );
  query
    .leftJoin('order_item')
    .on('product.product_id', '=', 'order_item.product_id');
  query
    .select('product.product_id', 'product_id')
    .select('product.uuid', 'uuid')
    .select('order_item.product_id')
    .select('image')
    .select('name')
    .select('price')
    .select('SUM(order_item.qty)', 'qty')
    .select('SUM(order_item.product_id)', 'sum')
    .where('order_item_id', 'IS NOT NULL', null);
  query
    .groupBy(
      'order_item.product_id',
      'product.product_id',
      'product_description.product_description_id'
    )
    .orderBy('qty', 'DESC')
    .limit(0, 5);
  const results = await query.execute(pool);

  response.json(
    results.map((p) => {
      const product = {
        ...p,
        editUrl: buildUrl('productEdit', { id: p.uuid })
      };
      if (p.image) {
        product.imageUrl = buildUrl('adminStaticAsset', [p.image]);
      }
      return product;
    })
  );
};
