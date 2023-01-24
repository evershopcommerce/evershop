/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
const {
  insertOnUpdate, select, del
} = require('@evershop/mysql-query-builder');
const { get } = require('../../../../lib/util/get');

module.exports = async (request, response, delegate) => {
  const productId = await delegate.updateProduct;
  const connection = await delegate.getConnection;
  const categories = get(request, 'body.categories', []);

  // Delete all categories
  await del('product_category')
    .where('product_id', '=', productId)
    .execute(connection, false);

  for (let i = 0; i < categories.length; i++) {
    const category = await select()
      .from('category')
      .where('category_id', '=', categories[i])
      .load(connection, false);

    if (category) {
      await insertOnUpdate('product_category')
        .given({ product_id: productId, category_id: categories[i] })
        .execute(connection, false);
    }
  }
};
