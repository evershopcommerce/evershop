const { initCart } = require('../../../../checkout/services/initCart');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response) => {
  if (!request.body.cart_id) {
    response.status(500).json({
      message: 'Invalid cart id',
      success: false,
      data: {}
    });
    return;
  }
  try {
    const cart = initCart(request.body.cart_id, request);
    return cart;
  } catch (e) {
    response.status(500).json({
      message: e.message,
      success: false,
      data: {}
    })
  }
};
