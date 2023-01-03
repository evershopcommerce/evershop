/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
const {
  insert
} = require('@evershop/mysql-query-builder');
const { get } = require('../../../../lib/util/get');

module.exports = async (request, response, delegate) => {
  const result = await delegate.createProduct;
  let productId = result.insertId;
  const connection = await delegate.getConnection;
  const categories = get(request, 'body.categories', []);
  // Add new 
  for (let i = 0; i < categories.length; i++) {
    if (categories[i]) {
      await insert('product_category')
        .given({ product_id: productId, category_id: categories[i] })
        .execute(connection, false);
    }
  }
};
