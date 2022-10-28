const { saveCart } = require('../../../../checkout/services/saveCart');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const promises = [];
  Object.keys(stack).forEach((id) => {
    // Check if middleware is async
    if (stack[id] instanceof Promise) {
      promises.push(stack[id]);
    }
  });
  try {
    // Wait for all promises to be resolved
    await Promise.all(promises);

    // Save the cart
    const cart = await stack.initShoppingCart;
    await saveCart(cart);

    // Send the response
    response.json({
      data: {},
      success: true,
      message: 'Coupon was applied successfully'
    });
  } catch (e) {
    // Send the response
    response.stack(500).json({
      data: {},
      success: false,
      message: e.message
    });
  }
};
