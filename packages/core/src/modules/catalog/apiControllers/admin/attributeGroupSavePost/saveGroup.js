const {
  startTransaction, update, insert, commit, rollback
} = require('@nodejscart/mysql-query-builder');
const { getConnection } = require('../../../../../lib/mysql/connection');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const connection = await getConnection();
  const data = request.body;
  try {
    await startTransaction(connection);
    if (data.group_id) {
      // Update group
      await update('attribute_group')
        .given(data)
        .where('attribute_group_id', '=', data.group_id)
        .execute(connection);
    } else {
      await insert('attribute_group')
        .given(data)
        .execute(connection);
    }
    await commit(connection);
    response.json({
      data: {},
      success: true,
      message: data.group_id ? 'Attribute group was updated successfully' : 'Attribute group was created successfully'
    });
  } catch (e) {
    await rollback(connection);
    response.json({
      success: false,
      message: e.message
    });
  }
};
