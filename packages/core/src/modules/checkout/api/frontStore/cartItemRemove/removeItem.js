const { del } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  try {
    // TODO: this should be improved
    const itemId = request.params.id;
    del('cart_item')
      .where('cart_item_id', '=', itemId)
      .execute(pool);
    response.json({
      data: {},
      success: true,
      message: 'Product was removed from the cart successfully'
    });
  } catch (error) {
    response.json({
      data: {},
      success: false,
      message: error.message
    });
  }
};
