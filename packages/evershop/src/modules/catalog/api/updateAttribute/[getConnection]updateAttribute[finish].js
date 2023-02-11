const { update, select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../lib/mysql/connection');
const { INVALID_PAYLOAD } = require('../../../../lib/util/httpStatus');

module.exports = async (request, response, delegate) => {
  const connection = await delegate.getConnection;
  const data = request.body;
  // Delete the attribute_code from the data object
  delete data.attribute_code;
  const attribute = await select()
    .from('attribute')
    .where('uuid', '=', request.params.id)
    .load(connection);

  if (!attribute) {
    response.status(INVALID_PAYLOAD);
    throw new Error('Invalid attribute id');
  }

  try {
    // We do not want to update the type of the attribute
    delete data.type;
    await update('attribute')
      .given(data)
      .where('uuid', '=', request.params.id)
      .execute(connection);
  } catch (e) {
    response.status(INVALID_PAYLOAD);
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }

  const results = await select()
    .from('attribute')
    .where('uuid', '=', request.params.id)
    .load(pool);

  return results;
};
