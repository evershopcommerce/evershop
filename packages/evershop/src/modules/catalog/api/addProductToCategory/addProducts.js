const { error } = require('@evershop/evershop/src/lib/log/logger');
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
  const { category_id } = request.params;
  const { product_id } = request.body;
  try {
    // Check if the category is exists
    const category = await select()
      .from('category')
      .where('uuid', '=', category_id)
      .load(pool);
    if (!category) {
      response.status(INVALID_PAYLOAD);
      return response.json({
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
      return response.json({
        success: false,
        message: 'Product does not exists'
      });
    }
    // Check if the product is already assigned to the category
    const productCategory = await select()
      .from('product')
      .where('category_id', '=', category.category_id)
      .and('product_id', '=', product.product_id)
      .load(pool);
    if (productCategory) {
      response.status(OK);
      return response.json({
        success: true,
        message: 'Product is assigned to the category'
      });
    }

    await updateProduct(
      product_id,
      {
        category_id: category.category_id
      },
      {
        routeId: request.currentRoute.id
      }
    );
    response.status(OK);
    return response.json({
      success: true,
      data: {
        product_id: product.product_id,
        category_id: category.category_id
      }
    });
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};
