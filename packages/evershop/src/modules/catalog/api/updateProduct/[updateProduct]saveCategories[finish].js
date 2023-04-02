/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
const {
  insertOnUpdate,
  select,
  del
} = require('@evershop/postgres-query-builder');
const { get } = require('@evershop/evershop/src/lib/util/get');

module.exports = async (request, response, delegate) => {
  const productId = await delegate.updateProduct;
  const connection = await delegate.getConnection;
  const categories = get(request, 'body.categories', []);

  // Get the variant if any
  const product = await select()
    .from('product')
    .where('uuid', '=', request.params.id)
    .load(connection);

  if (!product['variant_group_id']) {
    await saveProductCategories(productId, categories, connection);
  } else {
    const promises = [];
    const variants = await select()
      .from('product')
      .where('variant_group_id', '=', product['variant_group_id'])
      .execute(connection);

    for (let i = 0; i < variants.length; i += 1) {
      promises.push(
        saveProductCategories(variants[i]['product_id'], categories, connection)
      );
    }
    await Promise.all(promises);
  }
};

async function saveProductCategories(productId, categories, connection) {
  // Delete all categories
  await del('product_category')
    .where('product_id', '=', productId)
    .execute(connection, false);

  for (let i = 0; i < categories.length; i += 1) {
    const category = await select()
      .from('category')
      .where('category_id', '=', categories[i])
      .load(connection, false);

    if (category) {
      await insertOnUpdate('product_category', ['product_id', 'category_id'])
        .given({ product_id: productId, category_id: categories[i] })
        .execute(connection, false);
    }
  }
}
