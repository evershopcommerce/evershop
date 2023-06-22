/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
const {
  insertOnUpdate,
  select,
  del,
  update,
  execute
} = require('@evershop/postgres-query-builder');
const { get } = require('@evershop/evershop/src/lib/util/get');

module.exports = async (request, response, delegate) => {
  const productId = await delegate.updateProduct;
  const connection = await delegate.getConnection;
  const categoryId = get(request, 'body.category_id');

  if (categoryId === undefined) {
    return productId;
  }
  // Get the variant if any
  const product = await select()
    .from('product')
    .where('uuid', '=', request.params.id)
    .load(connection);

  if (product['variant_group_id']) {
    const promises = [];
    const variants = await select()
      .from('product')
      .where('variant_group_id', '=', product['variant_group_id'])
      .execute(connection);

    for (let i = 0; i < variants.length; i += 1) {
      promises.push(
        await update('product')
          .given({ category_id: categoryId })
          .where('variant_group_id', '=', product['variant_group_id'])
          .and('product_id', '!=', productId)
          .execute(connection, false)
      );
    }
    await Promise.all(promises);
  }
};

async function saveProductCategory(productId, category, connection) {
  // Load all parent categories recursively
  const parentCategories = await execute(
    `WITH RECURSIVE parent_categories AS (
      SELECT * FROM category WHERE category_id = ${category}
      UNION
      SELECT c.* FROM category c
      INNER JOIN parent_categories pc ON c.category_id = pc.parent_id
    ) SELECT * FROM parent_categories`
  );

  // Delete all the product_category records
  await del('product_category')
    .where('product_id', '=', productId)
    .execute(connection);

  // Insert the product, category to the product_category table
  for (let i = 0; i < parentCategories.length; i += 1) {
    await insertOnUpdate('product_category')
      .given({
        product_id: productId,
        category_id: parentCategories[i].category_id
      })
      .execute(connection);
  }
}
