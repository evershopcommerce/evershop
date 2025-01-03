const {
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR,
  OK
} = require('@evershop/evershop/src/lib/util/httpStatus');
const {
  translate
} = require('@evershop/evershop/src/lib/locale/translate/translate');
const { error } = require('@evershop/evershop/src/lib/log/logger');
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
          message: translate('Invalid cart'),
          status: INVALID_PAYLOAD
        }
      });
      return;
    }
    const { action, qty } = request.body;
    const item = await cart.updateItemQty(item_id, qty, action, { request });
    await saveCart(cart);
    response.status(OK);
    response.$body = {
      data: {
        item: item.export(),
        count: cart.getItems().length,
        cartId: cart.getData('uuid')
      }
    };
    next();
  } catch (err) {
    error(err);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: err.message
      }
    });
  }
};
