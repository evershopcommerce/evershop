const { update, select } = require('@evershop/postgres-query-builder');
const {
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');

module.exports = async (request, response, delegate) => {
  const connection = await delegate.getConnection;

  const collection = await select()
    .from('collection')
    .where('uuid', '=', request.params.id)
    .load(connection);

  if (!collection) {
    response.status(INVALID_PAYLOAD);
    throw new Error('Invalid collection id');
  }

  try {
    await update('collection')
      .given(request.body)
      .where('uuid', '=', request.params.id)
      .execute(connection);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }

  return request.body.id;
};
