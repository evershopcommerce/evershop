const { select } = require("@evershop/mysql-query-builder");

module.exports.getProductsBaseQuery = (categoryId) => {
  const query = select()
    .from('product');
  query.leftJoin('product_description')
    .on('product_description.`product_description_product_id`', '=', 'product.`product_id`');
  query.where(
    'product_id',
    'IN',
    (await select('product_id')
      .from('product_category')
      .where('category_id', '=', category.categoryId)
      .execute(pool)).map((row) => row.product_id)
  );
  query.andWhere('product.`status`', '=', 1);
  query.andWhere('product.`visibility`', '=', 1);

  return query;
};