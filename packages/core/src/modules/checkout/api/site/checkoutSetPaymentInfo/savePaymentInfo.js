const { getCustomerCart } = require("../../../services/getCustomerCart");
const { saveCart } = require("../../../services/saveCart");

module.exports = async (request, response, stack, next) => {
  const { body } = request;
  try {
    const cart = await getCustomerCart();
    // Save payment method
    await cart.setData('payment_method', body.payment_method);
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
