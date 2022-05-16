/* eslint-disable no-unused-vars */
const { del } = require('@evershop/mysql-query-builder');
const { getConnection } = require('../../../../../lib/mysql/connection');

module.exports = async (request, response, stack, next) => {
  const connection = await getConnection();
  try {
    const productIds = request.body.ids;
    await del('category')
      .where('category_id', 'IN', productIds.split(','))
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
