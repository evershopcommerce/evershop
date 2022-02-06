const { update } = require('@nodejscart/mysql-query-builder');
const { getConnection } = require('../../../../../lib/mysql/connection');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const connection = await getConnection();
  try {
    const productIds = request.body.ids;
    await update('product')
      .given({ status: 0 })
      .where('product_id', 'IN', productIds.split(','))
      .execute(connection);
    response.json({
      data: {},
      success: true
    });
  } catch (e) {
    response.json({
      data: {},
      message: e.message,
      success: false
    });
  }
};
