const { insert, update } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { addressValidator } = require('../../../services/addressValidator');
const { getCartByUUID } = require('../../../services/getCartByUUID');
const { saveCart } = require('../../../services/saveCart');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  try {
    const { address, cartId, useShippingAddress } = request.body;
    // Check if cart exists
    const cart = await getCartByUUID(cartId);
    if (!cart) {
      return response.status(400).json({
        message: "Invalid cart id",
        success: false
      });
    }
    // Use shipping address as a billing address
    if (useShippingAddress) {
      // Delete if exist billing address
      await update('cart')
        .given({ billing_address_id: null })
        .where('cart_id', '=', cart.getData('cart_id'))
        .execute(pool);
    } else {
      // Validate address
      if (!addressValidator(address)) {
        throw new TypeError('Invalid Address');
      }
      // Save billing address
      const result = await insert('cart_address').given(body).execute(pool);

      // Set shipping address ID
      await cart.setData('billing_address_id', parseInt(result.insertId, 10));
    }
    // Save cart
    await saveCart(cart);
    response.json({
      data: {},
      success: true,
      message: ''
    });
  } catch (e) {
    response.json({
      data: {},
      success: true,
      message: e.message
    });
  }
};
