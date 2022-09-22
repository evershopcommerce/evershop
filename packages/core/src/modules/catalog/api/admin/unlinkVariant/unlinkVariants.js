const { update } = require('@evershop/mysql-query-builder');
const { getConnection } = require('../../../../../lib/mysql/connection');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const connection = await getConnection();
  try {
    await update('product')
      .given({ variant_group_id: null, visibility: null })
      .where('product_id', '=', parseInt(`0${request.body.id}`, 10))
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
