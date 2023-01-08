/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
const {
  insertOnUpdate
} = require('@evershop/mysql-query-builder');
const { get } = require('../../../../lib/util/get');

module.exports = async (request, response, delegate) => {
  let productId = await delegate.updateProduct;
  const connection = await delegate.getConnection;
  const categories = get(request, 'body.categories', []);

  for (let i = 0; i < categories.length; i++) {
    if (categories[i]) {
      await insertOnUpdate('product_category')
        .given({ product_id: productId, category_id: categories[i] })
        .execute(connection, false);
    }
  }
};
