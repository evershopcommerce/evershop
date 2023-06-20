const { insert } = require('@evershop/postgres-query-builder');

module.exports = async (request, response, delegate) => {
  const connection = await delegate.getConnection;
  const result = await insert('product')
    .given(request.body)
    .execute(connection);

  await insert('product_description')
    .given(request.body)
    .prime('product_description_product_id', result.product_id)
    .execute(connection);

  // Save the product inventory
  await insert('product_inventory')
    .given(request.body)
    .prime('product_inventory_product_id', result.product_id)
    .execute(connection);

  return result;
};
