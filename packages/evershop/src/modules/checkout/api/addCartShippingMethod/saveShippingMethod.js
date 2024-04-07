/* eslint-disable camelcase */
const {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { error } = require('@evershop/evershop/src/lib/log/logger');
const {
  translate
} = require('@evershop/evershop/src/lib/locale/translate/translate');
const { getCartByUUID } = require('../../services/getCartByUUID');
const { saveCart } = require('../../services/saveCart');

module.exports = async (request, response, delegate, next) => {
  try {
    const { cart_id } = request.params;
    const { method_code } = request.body;
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
      await cart.setData('shipping_method', method_code);

      // Save the cart
      await saveCart(cart);
      response.status(OK);
      response.$body = {
        data: {
          method: {
            code: method_code
          }
        }
      };
      next();
    }
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        message: translate('Failed to set shipping method'),
        status: INTERNAL_SERVER_ERROR
      }
    });
  }
};
