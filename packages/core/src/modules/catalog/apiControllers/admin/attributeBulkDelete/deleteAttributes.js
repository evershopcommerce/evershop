const { del } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  try {
    const attributeIds = request.body.ids;
    await del('attribute')
      .where('attribute_id', 'IN', attributeIds.split(','))
      .execute(pool);
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
