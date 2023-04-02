/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
const { insert, select } = require('@evershop/postgres-query-builder');
const { get } = require('@evershop/evershop/src/lib/util/get');

module.exports = async (request, response, delegate) => {
  const result = await delegate.createProduct;
  const productId = result.insertId;
  const connection = await delegate.getConnection;
  const categories = get(request, 'body.categories', []);
  // Add new
  for (let i = 0; i < categories.length; i += 1) {
    const category = await select()
      .from('category')
      .where('category_id', '=', categories[i])
      .load(connection, false);

    if (category) {
      await insert('product_category')
        .given({ product_id: productId, category_id: categories[i] })
        .execute(connection, false);
    }
  }
};
