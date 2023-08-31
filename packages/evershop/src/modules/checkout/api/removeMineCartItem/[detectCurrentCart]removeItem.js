const {
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR,
  OK
} = require('@evershop/evershop/src/lib/util/httpStatus');
const {
  translate
} = require('@evershop/evershop/src/lib/locale/translate/translate');
const { getContextValue } = require('../../../graphql/services/contextHelper');
const { saveCart } = require('../../services/saveCart');
const { getCartByUUID } = require('../../services/getCartByUUID');

module.exports = async (request, response, delegate, next) => {
  try {
    const cartId = getContextValue(request, 'cartId');
    const { item_id } = request.params;
    if (!cartId) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          message: translate('Invalid cart'),
          status: INVALID_PAYLOAD
        }
      });
      return;
    }

    const cart = await getCartByUUID(cartId);
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
