const { select } = require('@evershop/postgres-query-builder');
const {
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR,
  OK
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { setContextValue } = require('../../../graphql/services/contextHelper');
const { getCartByUUID } = require('../../services/getCartByUUID');
const { saveCart } = require('../../services/saveCart');

module.exports = async (request, response, delegate, next) => {
  try {
    const cartId = request.params.cart_id;
    const { sku, qty } = request.body;
    const cart = await getCartByUUID(cartId); // Cart object

    // If the cart is not found, respond with 400
    if (!cart) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid cart id'
        }
      });
      return;
    }

    // Load the product by sku
    const product = await select()
      .from('product')
      .where('sku', '=', sku)
      .and('status', '=', 1)
      .load(pool);

    if (!product) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Product not found'
        }
      });
      return;
    }

    // If everything is fine, add the product to the cart
    const item = await cart.addItem(product.product_id, parseInt(qty, 10));
    await saveCart(cart);
    // Set the new cart id to the context, so next middleware can use it
    setContextValue(request, 'cartId', cart.getData('uuid'));
    response.status(OK);
    response.$body = {
      data: {
        item: item.export(),
        count: cart.getItems().length,
        cartId: cart.getData('uuid')
      }
    };
    next();
  } catch (error) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: error.message
      }
    });
  }
};
