const { insert } = require('@evershop/mysql-query-builder');

module.exports = async (request, response, stack) => {
  if (request.body.product_id) { return null; }

  const connection = await stack.getConnection;
  const result = await insert('product').given(request.body).execute(connection);
  await insert('product_description')
    .given(request.body)
    .prime('product_description_product_id', result.insertId).execute(connection);

  return result;
};
