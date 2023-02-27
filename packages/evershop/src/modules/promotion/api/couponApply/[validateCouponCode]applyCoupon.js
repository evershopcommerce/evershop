const {
  INVALID_PAYLOAD,
  OK,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { getCartByUUID } = require('../../../checkout/services/getCartByUUID');
const { saveCart } = require('../../../checkout/services/saveCart');

module.exports = async (request, response, delegate, next) => {
  try {
    // eslint-disable-next-line camelcase
    const { cart_id } = request.params;
    const { coupon } = request.body;
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
    await cart.setData('coupon', coupon);
    await saveCart(cart);
    response.status(OK);
    response.$body = {
      data: {
        coupon
      }
    };
    next();
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        message: e.message,
        status: INTERNAL_SERVER_ERROR
      }
    });
  }
};
