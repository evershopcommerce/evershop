const { select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');

module.exports.getProductsBaseQuery = async (categoryId) => {
  const query = select().from('product');
  query
    .leftJoin('product_description')
    .on(
      'product_description.product_description_product_id',
      '=',
      'product.product_id'
    );
  query.where(
    'product.product_id',
    'IN',
    (
      await select('product_id')
        .from('product_category')
        .where('category_id', '=', categoryId)
        .execute(pool)
    ).map((row) => row.product_id)
  );
  query.andWhere('product.status', '=', 1);

  return query;
};
