/* eslint-disable camelcase */
const {
  INVALID_PAYLOAD,
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { getCartByUUID } = require('../../services/getCartByUUID');
const { saveCart } = require('../../services/saveCart');

module.exports = async (request, response, delegate, next) => {
  try {
    const { cart_id } = request.params;
    const { email } = request.body;
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
      await cart.setData('customer_email', email);
      await saveCart(cart);
      response.status(OK);
      response.$body = {
        data: {
          email: cart.getData('customer_email')
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
