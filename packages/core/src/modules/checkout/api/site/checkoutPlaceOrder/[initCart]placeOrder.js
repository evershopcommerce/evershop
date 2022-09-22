const { createOrder } = require('../../../services/orderCreator');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  try {
    const cart = await stack.initCart;
    await stack.savePaymentInfo;
    // TODO: 1: Use middleware to verify cart, 2: Use JWT to verify user, API should stay stateless
    const orderId = await createOrder(cart);
    request.session.orderId = orderId;
    response.json({
      data: {
        orderId
      },
      success: true,
      message: ''
    });
  } catch (e) {
    response.json({
      data: {},
      success: false,
      message: e.message
    });
  }
};
