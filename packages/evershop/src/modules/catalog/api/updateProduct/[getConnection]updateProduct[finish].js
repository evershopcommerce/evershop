const { update, select } = require('@evershop/postgres-query-builder');
const {
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');

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

  try {
    await update('product')
      .given(request.body)
      .where('product_id', '=', product.product_id)
      .execute(connection);

    await update('product_description')
      .given(request.body)
      .where('product_description_product_id', '=', product.product_id)
      .execute(connection);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }

  return product.product_id;
};
