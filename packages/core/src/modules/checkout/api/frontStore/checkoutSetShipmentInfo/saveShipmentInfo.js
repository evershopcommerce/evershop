const { insert } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { addressValidator } = require('../../../services/addressValidator');
const { getCartByUUID } = require('../../../services/getCartByUUID');
const { saveCart } = require('../../../services/saveCart');

module.exports = async (request, response, stack, next) => {
  try {
    const { address, method, cartId } = request.body;
    // Check if cart exists
    const cart = await getCartByUUID(cartId);
    if (!cart) {
      return response.status(400).json({
        message: "Invalid cart id",
        success: false
      });
    }
    // Validate address
    if (!addressValidator(address)) {
      throw new TypeError('Invalid Address');
    }

    // Save shipping address
    const result = await insert('cart_address').given(address).execute(pool);

    // Set shipping address ID
    await cart.setData('shipping_address_id', parseInt(result.insertId, 10));

    // Save shipping method
    // Each shipping method should have a middleware to validate the payment method before this step
    await cart.setData('shipping_method', method);

    // Save the cart
    await saveCart(cart);
    response.$body = {
      data: {
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
