const { insert, select } = require('@nodejscart/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { addressValidator } = require('../../../services/addressValidator');

module.exports = async (request, response, stack, next) => {
  const cart = await stack.initCart;
  try {
    // Validate address
    if (!addressValidator(request.body)) { throw new TypeError('Invalid Address'); }

    // Save shipping address
    const result = await insert('cart_address').given(request.body).execute(pool);

    // Set shipping address ID
    await cart.setData('shipping_address_id', parseInt(result.insertId, 10));

    // Save shipping method
    await cart.setData('shipping_method', request.body.shipping_method);

    response.$body = {
      data: {
        address: await select().from('cart_address').where('cart_address_id', '=', result.insertId).load(pool),
        method: {
          code: cart.getData('shipping_method'),
          name: cart.getData('shipping_method_name')
        }
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
