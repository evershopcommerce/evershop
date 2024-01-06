const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  INVALID_PAYLOAD,
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { select } = require('@evershop/postgres-query-builder');
const updateProduct = require('../../services/product/updateProduct');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const { category_id, product_id } = request.params;
  try {
    // Check if the category is exists
    const category = await select()
      .from('category')
      .where('uuid', '=', category_id)
      .load(pool);

    if (!category) {
      response.status(INVALID_PAYLOAD);
      response.json({
        success: false,
        message: 'Category does not exists'
      });
    }

    // Check if the product is exists
    const product = await select()
      .from('product')
      .where('uuid', '=', product_id)
      .load(pool);

    if (!product) {
      response.status(INVALID_PAYLOAD);
      response.json({
        success: false,
        message: 'Product does not exists'
      });
    }

    // Remove the product from the category
    await updateProduct(product_id, { category_id: null });
    response.status(OK);
    response.json({
      success: true,
      data: {
        product_id,
        category_id
      }
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      success: false,
      message: e.message
    });
  }
};
