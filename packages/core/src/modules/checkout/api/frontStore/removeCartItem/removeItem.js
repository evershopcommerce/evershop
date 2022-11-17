const { getCartByUUID } = require("../../../services/getCartByUUID");
const saveCart = require("./saveCart");

module.exports = async (request, response, delegate, next) => {
  try {
    const { cartId, itemId } = request.body;
    const cart = await getCartByUUID(cartId);
    if (!cart) {
      response.status(400).send({
        message: "Invalid cart ID",
        success: false,
      });
      return;
    }

    const item = await cart.removeItem(itemId);
    await saveCart(cart);
    response.$body = {
      data: {
        item: item.export()
      },
      success: true,
      message: `Product ${item.getData('product_name')} was removed from cart successfully`
    };
  } catch (error) {
    response.$body = {
      data: {},
      success: false,
      message: error.message
    };
  }
  next();
};
