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

  await update('attribute')
    .given(data)
    .where('uuid', '=', request.params.id)
    .execute(connection);

  return await select().from('attribute').where('uuid', '=', request.params.id).load(pool);
};
