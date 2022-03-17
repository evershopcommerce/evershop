module.exports = async (request, response, stack, next) => {
  const cart = await stack.initCart;
  try {
    await cart.setData('customer_email', request.body.email);
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
