const { del } = require('@nodejscart/mysql-query-builder');
const { getConnection } = require('../../../../../lib/mysql/connection');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const connection = await getConnection();
  try {
    const pageIds = request.body.ids;
    await del('cms_page')
      .where('cms_page_id', 'IN', pageIds.split(','))
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
