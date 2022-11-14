const { getCartByUUID } = require('../../../services/getCartByUUID');
const { createOrder } = require('../../../services/orderCreator');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  try {
    const { cartId } = request.params;
    // Verify cart
    const cart = await getCartByUUID(cartId);
    if (!cart) {
      return response.status(400).json({
        message: "Invalid cart id",
        success: false
      });
    } else if (cart.hasError()) {
      return response.status(400).json({
        message: cart.error,
        success: false
      });
    }

    const orderId = await createOrder(cart);
    response.json({
      data: {
        orderId
      },
      success: true,
      message: ''
    });
  } catch (e) {
    response.json({
      data: {},
      success: false,
      message: e.message
    });
  }
};
