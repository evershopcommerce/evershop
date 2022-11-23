/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
const {
  insert, del
} = require('@evershop/mysql-query-builder');
const { get } = require('../../../../../lib/util/get');

module.exports = async (request, response, delegate) => {
  const promises = [delegate.createProduct, delegate.updateProduct];
  const results = await Promise.all(promises);
  let productId;
  if (request.body.product_id) {
    productId = request.body.product_id;
  } else {
    productId = results[0].insertId;
  }
  const connection = await delegate.getConnection;
  const categories = get(request, 'body.categories', []);
  console.log(categories)
  // Delete all
  await del('product_category').where('product_id', '=', productId).execute(connection, false);
  // Add new 
  for (let i = 0; i < categories.length; i++) {
    await insert('product_category').given({ product_id: productId, category_id: categories[i] }).execute(connection, false);
  }
};
