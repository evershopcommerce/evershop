const { execute } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { getProductsBaseQuery } = require('./getProductsBaseQuery');

module.exports.getProductsByCategoryBaseQuery = async (
  categoryId,
  fromSubCategories = false
) => {
  const query = getProductsBaseQuery();

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

  return query;
};
