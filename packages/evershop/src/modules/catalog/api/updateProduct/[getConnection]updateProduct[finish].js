const { update, select } = require('@evershop/mysql-query-builder');
const { INVALID_PAYLOAD } = require('../../../../lib/util/httpStatus');

module.exports = async (request, response, delegate) => {
  const connection = await delegate.getConnection;
  const product = await select()
    .from('product')
    .where('uuid', '=', request.params.id)
    .load(connection);

  if (!product) {
    response.status(INVALID_PAYLOAD);
    throw new Error('Invalid product id');
  }

  await update('product').given(request.body)
    .where('product_id', '=', product['product_id'])
    .execute(connection);
  await update('product_description')
    .given(request.body).where('product_description_product_id', '=', product['product_id'])
    .execute(connection);

  return product['product_id'];
};
