const { insert, update } = require('@nodejscart/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { addressValidator } = require('../../../services/addressValidator');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const { body } = request;
  const cart = await stack.initCart;
  try {
    // Use shipping address as a billing address
    if (body.use_shipping_address) {
      // Delete if exist billing address
      await update('cart')
        .given({ billing_address_id: null })
        .where('cart_id', '=', cart.getData('cart_id'))
        .execute(pool);
    } else {
      // Validate address
      if (!addressValidator(body)) { throw new TypeError('Invalid Address'); }
      // Save billing address
      const result = await insert('cart_address').given(body).execute(pool);

      // Set shipping address ID
      await cart.setData('billing_address_id', parseInt(result.insertId, 10));
    }

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
