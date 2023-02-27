const {
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { getContextValue } = require('../../../graphql/services/contextHelper');
const removeItem = require('../removeCartItem/removeItem');

module.exports = async (request, response, delegate, next) => {
  try {
    const cartId = getContextValue(request, 'cartId');
    if (!cartId) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          message: 'Invalid cart',
          status: INVALID_PAYLOAD
        }
      });
      return;
    }

    request.params.cart_id = cartId;
    await removeItem(request, response, delegate, next);
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
