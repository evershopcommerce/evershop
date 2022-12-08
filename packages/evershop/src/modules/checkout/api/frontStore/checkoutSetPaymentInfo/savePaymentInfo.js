const { insert } = require("@evershop/mysql-query-builder");
const { pool } = require("../../../../../lib/mysql/connection");
const { addressValidator } = require("../../../services/addressValidator");
const { getCartByUUID } = require("../../../services/getCartByUUID");
const { saveCart } = require("../../../services/saveCart");

module.exports = async (request, response, stack, next) => {
  try {
    const { address, useShippingAddress, methodCode, methodName, cartId } = request.body;
    // Check if cart exists
    const cart = await getCartByUUID(cartId);
    if (!cart) {
      return response.status(400).json({
        message: "Invalid cart id",
        success: false
      });
    }

    // Save payment method
    await cart.setData('payment_method', methodCode);
    await cart.setData('payment_method_name', methodName);

    // Save billing address
    if (useShippingAddress) {
      // Delete if exist billing address
      await cart.setData('billing_address_id', null);
    } else {
      // Validate address
      if (!addressValidator(address)) {
        throw new TypeError('Invalid Address');
      }
      // Save billing address
      const result = await insert('cart_address').given(address).execute(pool);
      // Set shipping address ID
      await cart.setData('billing_address_id', parseInt(result.insertId, 10));
    }
    // Save the cart
    await saveCart(cart);
    response.$body = {
      data: {
        method: {
          code: methodCode,
          name: methodName
        }
      },
      success: true,
      message: ''
    };
    next();
  } catch (e) {
    response.json({
      data: {},
      success: false,
      message: 'Payment method is invalid'
    });
  }
};
