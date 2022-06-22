module.exports = async (request, response, stack, next) => {
  let cart = await stack['initShoppingCart'];
  try {
    await cart.setData('coupon', request.body.coupon);
    return next();
  } catch (e) {
    response.status(500).json({
      message: e.message,
      success: false,
      data: {}
    });
    return;
  }
};
