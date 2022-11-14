const { getContextValue } = require("../../../../graphql/services/contextHelper");
const { CartFactory } = require("../../../services/cart/CartFactory");

module.exports = async (request, response, delegate, next) => {
  try {
    const tokenPayload = getContextValue(request, 'tokenPayload');
    const cart = await CartFactory.getCart(tokenPayload.sid); // Cart object
    const productId = parseInt(`0${request.body.product_id}`, 10);
    const qty = parseInt(`0${request.body.qty}`, 10);
    if (qty < 1) {
      throw new Error('Invalid quantity');
    }
    const item = await cart.addItem({ product_id: productId, qty });
    response.$body = {
      data: {
        item: item.export(),
        count: cart.getItems().length
      },
      success: true,
      message: 'Product was added to cart successfully'
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
