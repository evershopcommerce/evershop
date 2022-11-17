const { getContextValue, setContextValue } = require("../../../../graphql/services/contextHelper");
const { createNewCart } = require("../../../services/createNewCart");
const { getCartByUUID } = require("../../../services/getCartByUUID");
const { saveCart } = require("../../../services/saveCart");

module.exports = async (request, response, delegate, next) => {
  try {
    let { cartId, productId, qty } = request.body;
    let cart;
    if (!cartId) {
      // Create a new cart
      const tokenPayload = getContextValue(request, "tokenPayload", {});
      cart = await createNewCart(tokenPayload);
    } else {
      cart = await getCartByUUID(cartId); // Cart object
    }

    // If the cart is not found, respond with 400
    if (!cart) {
      response.status(400).json({ message: "Cart not found", success: false });
      return;
    }

    productId = parseInt(`0${productId}`, 10);
    qty = parseInt(`0${qty}`, 10);
    if (qty < 1) {
      response.status(400).json({ message: "Invalid quantity", success: false });
      return;
    }

    // If everything is fine, add the product to the cart
    const item = await cart.addItem({ product_id: productId, qty });
    await saveCart(cart);
    // Set the new cart id to the context, so next middleware can use it
    setContextValue(request, 'cartId', cart.getData('uuid'));
    response.$body = {
      data: {
        item: item.export(),
        count: cart.getItems().length,
        cartId: cart.getData('uuid')
      },
      success: true,
      message: `Product ${item.getData('product_name')} was added to cart successfully`
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
