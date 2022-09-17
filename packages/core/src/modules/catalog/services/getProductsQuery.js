const { select } = require("@evershop/mysql-query-builder");
const { pool } = require("../../../lib/mysql/connection");
const { getProductsBaseQuery } = require("./getProductsBaseQuery");

module.exports.getProductsQuery = async function getProductsQuery(categoryId) {
  // Visibility filter
  // Get the products query
  const query = await getProductsBaseQuery(categoryId);

  // Visibility. For variant group
  const copy = query.clone();
  // Get all group that have at lease 1 item visibile
  const visibleGroups = (await select('variant_group_id')
    .from('variant_group')
    .where('visibility', '=', 1)
    .execute(pool)).map((v) => v.variant_group_id);

  if (visibleGroups) {
    // Get all invisible variants from current query
    copy.select('SUM(product.`visibility`)', 'sumv')
      .select('product_id')
      .andWhere('product.variant_group_id', 'IN', visibleGroups);
    copy.groupBy('product.variant_group_id')
      .having('sumv', '=', 0);

    const invisibleIds = (await copy.execute(pool)).map((v) => v.product_id);
    if (invisibleIds.length > 0) {
      const n = node('AND');
      n.addLeaf('AND', 'product.`product_id`', 'IN', invisibleIds)
        .addNode(
          node('OR')
            .addLeaf('OR', 'product.`visibility`', '<>', 0)
            .addLeaf('OR', 'product.`visibility`', 'IS', null)
        );
      query.getWhere().addNode(n);
    } else {
      query.andWhere('product.`visibility`', '<>', 0)
        .or('product.`visibility`', 'IS', null);
    }
  } else {
    query.andWhere('product.`visibility`', '<>', 0)
      .or('product.`visibility`', 'IS', null);
  }

  return query;
}