/* eslint-disable camelcase */
const {
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR,
  OK
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { getCartByUUID } = require('../../services/getCartByUUID');
const { saveCart } = require('../../services/saveCart');

module.exports = async (request, response, delegate, next) => {
  try {
    const { cart_id, item_id } = request.params;
    const cart = await getCartByUUID(cart_id);
    if (!cart) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          message: 'Invalid cart',
          status: INVALID_PAYLOAD
        }
      });
      return;
    }

    const item = await cart.removeItem(item_id);
    await saveCart(cart);
    response.status(OK);
    response.$body = {
      data: {
        item: item.export()
      }
    };
    next();
  } catch (error) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        message: error.message,
        status: INTERNAL_SERVER_ERROR
      }
    });
  }
};
