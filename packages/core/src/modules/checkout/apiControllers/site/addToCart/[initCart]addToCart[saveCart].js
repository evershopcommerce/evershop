module.exports = async (request, response, stack, next) => {
  try {
    const cart = await stack.initCart;
    const productId = parseInt(`0${request.body.product_id}`, 10);
    const qty = parseInt(`0${request.body.qty}`, 10);

    if (qty < 1) { throw new Error('Invalid quantity'); }
    await cart.addItem({ product_id: productId, qty });
    // Extract cart info
    const cartInfo = cart.export();
    const items = cart.getItems();
    cartInfo.items = items.map((item) => item.export());

    response.$body = {
      data: { cart: cartInfo },
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
