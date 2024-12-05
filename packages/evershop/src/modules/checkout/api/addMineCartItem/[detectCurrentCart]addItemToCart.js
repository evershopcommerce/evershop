const { select } = require('@evershop/postgres-query-builder');
const {
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR,
  OK
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  translate
} = require('@evershop/evershop/src/lib/locale/translate/translate');
const { error } = require('@evershop/evershop/src/lib/log/logger');
const {
  setContextValue,
  getContextValue
} = require('../../../graphql/services/contextHelper');
const { getCartByUUID } = require('../../services/getCartByUUID');
const { saveCart } = require('../../services/saveCart');
const { createNewCart } = require('../../services/createNewCart');

module.exports = async (request, response, delegate, next) => {
  try {
    let cartId = getContextValue(request, 'cartId');
    let cart;
    if (!cartId) {
      // Create a new cart
      const { sessionID, customer } = request.locals;
      cart = await createNewCart(sessionID, customer || {});
      cartId = cart.getData('uuid');
    } else {
      cart = await getCartByUUID(cartId); // Cart object
    }
    const { sku, qty } = request.body;

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
          message: translate('Product not found')
        }
      });
      return;
    }

    // If everything is fine, add the product to the cart
    const item = await cart.addItem(product.product_id, parseInt(qty, 10), {
      request
    });
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
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: error.message
      }
    });
  }
};
