const { select, node } = require('@nodejscart/mysql-query-builder');
const config = require('config');
const { pool } = require('../../../../../lib/mysql/connection');
const { assign } = require('../../../../../lib/util/assign');
const { get } = require('../../../../../lib/util/get');

module.exports = async (request, response, stack, next) => {
  try {
    // Wait for product to be fully loaded
    await stack.loadProduct;
    const { product } = response.context;
    const queries = request.query;
    if (!get(product, 'variant_group_id') || Object.values(queries).length === 0) { next(); } else {
      const group = await select()
        .from('variant_group')
        .select('attribute_one')
        .select('attribute_two')
        .select('attribute_three')
        .select('attribute_four')
        .select('attribute_five')
        .where('variant_group_id', '=', product.variant_group_id)
        .load(pool);

      const attributes = await select()
        .from('attribute')
        .where('attribute_id', 'IN', Object.values(group).filter((v) => v != null))
        .and('attribute_code', 'IN', Object.keys(queries))
        .execute(pool);

      if (attributes.length > 0) {
        const vsQuery = select().from('product', 'p')
          .select('p.`product_id`')
          .select('a.`attribute_id`')
          .select('a.`option_id`')
          .select('COUNT(p.`product_id`)', 'count');
        vsQuery.innerJoin('product_attribute_value_index', 'a')
          .on('p.product_id', '=', 'a.`product_id`');
        vsQuery.where('p.variant_group_id', '=', product.variant_group_id)
          .and('p.status', '=', 1);

        if (config.get('catalog.showOutOfStockProduct') === false) {
          vsQuery.andWhere('p.manage_stock', '=', '0')
            .addNode(
              node('OR').addLeaf('AND', 'p.qty', '>', 0).addLeaf('AND', 'p.stock_availability', '=', 1)
            );
        }
        vsQuery.andWhere('a.attribute_id', 'IN', attributes.map((a) => a.attribute_id))
          .and('a.option_id', 'IN', attributes.map((a) => queries[a.attribute_code]));
        vsQuery.groupBy('p.`product_id`');
        vsQuery.having('count', '>=', attributes.length);
        const variants = await vsQuery.execute(pool);

        if (variants.length > 0) {
          const query = select();
          query.from('product')
            .leftJoin('product_description')
            .on('product.`product_id`', '=', 'product_description.`product_description_product_id`');
          query.where('product_id', '=', variants[0].product_id);
          const pv = await query.load(pool);
          assign(response.context, {
            product: JSON.parse(JSON.stringify(pv)),
            metaTitle: pv.meta_title || pv.name,
            metaDescription: pv.meta_description || pv.short_description
          });
          assign(response.context.product, {
            variantSelection: JSON.parse(JSON.stringify(Object.keys(queries)
              .filter((key) => attributes.findIndex((a) => a.attribute_code === key) !== -1)
              .reduce((obj, key) => {
                // eslint-disable-next-line no-param-reassign
                obj[key] = queries[key];
                return obj;
              }, {})))
          });
        }
      }
      next();
    }
  } catch (e) {
    next(e);
  }
};
