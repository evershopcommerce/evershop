const { getCartByUUID } = require('../../../services/getCartByUUID');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  try {
    const cartId = request.params?.cartId;
    // Verify cart
    const cart = await getCartByUUID(cartId);
    if (!cart) {
      return response.status(400).json({
        message: "Invalid cart id",
        success: false
      });
    }
    next();
  } catch (e) {
    response.json({
      data: {},
      success: false,
      message: e.message
    });
  }
};
