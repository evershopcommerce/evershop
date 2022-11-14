const { update } = require('@evershop/mysql-query-builder');
const { getConnection } = require('../../../../../lib/mysql/connection');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const connection = await getConnection();
  try {
    const customerIds = request.body.ids;
    await update('customer')
      .given({ status: 1 })
      .where('customer_id', 'IN', customerIds.split(','))
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
