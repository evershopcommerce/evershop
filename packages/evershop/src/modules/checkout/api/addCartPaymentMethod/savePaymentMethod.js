/* eslint-disable camelcase */
const {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { getCartByUUID } = require('../../services/getCartByUUID');
const { saveCart } = require('../../services/saveCart');

module.exports = async (request, response, delegate, next) => {
  try {
    const { cart_id } = request.params;
    const { method_code, method_name } = request.body;
    // Check if cart exists
    const cart = await getCartByUUID(cart_id);
    if (!cart) {
      response.status(INVALID_PAYLOAD).json({
        error: {
          message: 'Invalid cart',
          status: INVALID_PAYLOAD
        }
      });
    } else {
      // Save payment method
      await cart.setData('payment_method', method_code);
      await cart.setData('payment_method_name', method_name);

      // Save the cart
      await saveCart(cart);
      response.status(OK);
      response.$body = {
        data: {
          method: {
            code: method_code,
            name: method_name
          }
        }
      };
      next();
    }
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        message: e.message,
        status: INTERNAL_SERVER_ERROR
      }
    });
  }
};
