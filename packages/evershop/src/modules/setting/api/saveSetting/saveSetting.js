const { insertOnUpdate } = require('@evershop/mysql-query-builder');
const { pool, getConnection } = require('../../../../../lib/mysql/connection');
const { OK, INTERNAL_SERVER_ERROR } = require('../../../../lib/util/httpStatus');
const { refreshSetting } = require('../../../services/setting');

module.exports = async (request, response, delegate, next) => {
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
    response.status(OK);
    response.json({
      data: {}
    });
  } catch (error) {
    await connection.rollback();
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: error.message
      }
    });
  }
};
