const { getCartByUUID } = require("../../../services/getCartByUUID");
const { saveCart } = require("../../../services/saveCart");

module.exports = async (request, response, stack, next) => {
  try {
    const { email, cartId } = request.body;
    // Check if email is valid
    if (!email || !email.match(/.+@.+\..+/)) {
      return response.status(400).json({
        message: "Invalid email address",
        success: false
      });
    }

    // Check if cart exists
    const cart = await getCartByUUID(cartId);
    if (!cart) {
      return response.status(400).json({
        message: "Invalid cart id",
        success: false
      });
    }
    await cart.setData('customer_email', email);
    await saveCart(cart);
    response.$body = {
      data: {
        email: cart.getData('customer_email')
      },
      success: true,
      message: ''
    };
  } catch (e) {
    response.$body = {
      data: {},
      success: false,
      message: e.message
    };
  }
  next();
};
