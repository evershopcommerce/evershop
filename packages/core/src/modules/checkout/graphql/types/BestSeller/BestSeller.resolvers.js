const { select } = require("@evershop/mysql-query-builder");
const { camelCase } = require("../../../../../lib/util/camelCase");

module.exports = {
  Query: {
    bestSellers: async (_, { }, { tokenPayload }) => {
      const query = select();
      query.from('product').leftJoin('product_description').on('product.`product_id`', '=', 'product_description.`product_description_product_id`');
      query.leftJoin('order_item').on('product.`product_id`', '=', 'order_item.`product_id`');
      query.select('product.*')
        .select('product_description.*')
        .select('SUM(order_item.`qty`)', 'qty')
        .select('SUM(order_item.`product_id`)', 'sum')
        .where('order_item_id', 'IS NOT', null);
      query.groupBy('order_item.`product_id`')
        .orderBy('qty', 'DESC')
        .limit(0, 5);
      const results = await query.execute(pool);
      return results.map(p => camelCase(p));
    }
  }
}
