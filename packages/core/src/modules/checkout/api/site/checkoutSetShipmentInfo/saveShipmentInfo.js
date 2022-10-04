const { insert, select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { getContext, getContextValue } = require('../../../../graphql/services/contextHelper');
const { addressValidator } = require('../../../services/addressValidator');
const { getCustomerCart } = require('../../../services/getCustomerCart');
const { saveCart } = require('../../../services/saveCart');

module.exports = async (request, response, stack, next) => {
  try {
    const customer = getContextValue(request, 'tokenPayload');
    const cart = await getCustomerCart(customer);

    // Validate address
    if (!addressValidator(request.body)) {
      throw new TypeError('Invalid Address');
    }

    // Save shipping address
    const result = await insert('cart_address').given(request.body).execute(pool);

    // Set shipping address ID
    await cart.setData('shipping_address_id', parseInt(result.insertId, 10));

    // Save shipping method
    await cart.setData('shipping_method', request.body.shipping_method);

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
