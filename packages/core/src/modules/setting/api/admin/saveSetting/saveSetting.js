const { insertOnUpdate } = require('@evershop/mysql-query-builder');
const { pool, getConnection } = require('../../../../../lib/mysql/connection');
const { refreshSetting } = require('../../../services/setting');

module.exports = async (request, response, stack, next) => {
  const { body } = request;
  const connection = await getConnection();
  try {
    // Loop through the body and insert the data
    for (const key in body) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        const value = body[key];
        // Check if the value is a object or array
        if (typeof value === 'object') {
          await insertOnUpdate('setting')
            .given({
              name: key,
              value: JSON.stringify(value),
              is_json: 1
            })
            .execute(pool)
        } else {
          await insertOnUpdate('setting')
            .given({
              name: key,
              value: value,
              is_json: 0
            })
            .execute(pool)
        }
      }
    }
    await connection.commit();
    // Refresh the setting
    await refreshSetting();
    response.json({
      success: true
    });
  } catch (error) {
    await connection.rollback();
    response.json({
      success: false,
      message: error.message
    });
  }
};
