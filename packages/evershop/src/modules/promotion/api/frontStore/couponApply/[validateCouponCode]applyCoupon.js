const { getCartByUUID } = require("../../../../checkout/services/getCartByUUID");
const { saveCart } = require("../../../../checkout/services/saveCart");

module.exports = async (request, response, stack, next) => {
  try {
    const { cartId, coupon } = request.body;
    const cart = await getCartByUUID(cartId);
    if (!cart) {
      throw new Error("Invalid cart id");
    }
    await cart.setData('coupon', coupon);
    await saveCart(cart);
    response.$body = {
      data: {
        coupon: coupon
      },
      success: true,
      message: `Coupon applied successfully`
    };
    next();
  } catch (e) {
    response.status(500).json({
      message: 'Invalid coupon code',
      success: false,
      data: {}
    });
    return;
  }
};
