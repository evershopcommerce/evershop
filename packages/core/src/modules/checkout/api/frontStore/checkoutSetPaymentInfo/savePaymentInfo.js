const { insert } = require("@evershop/mysql-query-builder");
const { pool } = require("../../../../../lib/mysql/connection");
const { addressValidator } = require("../../../services/addressValidator");
const { getCartByUUID } = require("../../../services/getCartByUUID");
const { saveCart } = require("../../../services/saveCart");

module.exports = async (request, response, stack, next) => {
  try {
    const { address, method, cartId } = request.body;
    // Check if cart exists
    const cart = await getCartByUUID(cartId);
    if (!cart) {
      return response.status(400).json({
        message: "Invalid cart id",
        success: false
      });
    }

    // Save payment method
    // Each payment method should have a middleware to validate the payment method before this step
    await cart.setData('payment_method', method);
    // Save the cart
    await saveCart(cart);
    response.$body = {
      data: {},
      success: true,
      message: ''
    };
    next();
  } catch (e) {
    response.json({
      data: {},
      success: false,
      message: e.message
    });
  }
};
