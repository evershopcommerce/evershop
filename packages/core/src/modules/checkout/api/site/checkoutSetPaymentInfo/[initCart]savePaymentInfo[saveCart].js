module.exports = async (request, response, stack, next) => {
  const { body } = request;
  const cart = await stack.initCart;
  try {
    // Save payment method
    await cart.setData('payment_method', body.payment_method);
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
