const { getCartById } = require("../../../../checkout/services/getCartById");

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
    const cart = await getCartById(request.body.cart_id);
    return cart;
  } catch (e) {
    response.status(500).json({
      message: e.message,
      success: false,
      data: {}
    })
  }
};
