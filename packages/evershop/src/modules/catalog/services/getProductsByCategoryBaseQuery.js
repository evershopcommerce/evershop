const { select, node, execute } = require('@evershop/postgres-query-builder');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');

module.exports.getProductsByCategoryBaseQuery = async (
  categoryId,
  fromSubCategories = false
) => {
  const query = select().from('product');
  query
    .leftJoin('product_description')
    .on(
      'product_description.product_description_product_id',
      '=',
      'product.product_id'
    );
  query
    .innerJoin('product_inventory')
    .on(
      'product_inventory.product_inventory_product_id',
      '=',
      'product.product_id'
    );

  if (!fromSubCategories) {
    query.where('product.category_id', '=', categoryId);
  } else {
    // Get all the sub categories recursively
    const subCategoriesQuery = await execute(
      pool,
      `WITH RECURSIVE sub_categories AS (
        SELECT * FROM category WHERE category_id = ${categoryId}
        UNION
        SELECT c.* FROM category c
        INNER JOIN sub_categories sc ON c.parent_id = sc.category_id
      ) SELECT * FROM sub_categories`
    );
    const subCategories = subCategoriesQuery.rows;
    const categoryIds = subCategories.map((category) => category.category_id);
    query.where('product.category_id', 'IN', categoryIds);
  }
  query.andWhere('product.status', '=', 1);

  if (getConfig('catalog.showOutOfStockProduct', false) === false) {
    query
      .andWhere('product_inventory.manage_stock', '=', false)
      .addNode(
        node('OR')
          .addLeaf('AND', 'product_inventory.qty', '>', 0)
          .addLeaf('AND', 'product_inventory.stock_availability', '=', true)
      );
  }
  return query;
};
