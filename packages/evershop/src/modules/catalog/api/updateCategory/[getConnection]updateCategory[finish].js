const { update, select } = require('@evershop/postgres-query-builder');
const {
  INVALID_PAYLOAD
} = require('@evershop/evershop/src/lib/util/httpStatus');

module.exports = async (request, response, delegate) => {
  const connection = await delegate.getConnection;

  const category = await select()
    .from('category')
    .where('uuid', '=', request.params.id)
    .load(connection);

  if (!category) {
    response.status(INVALID_PAYLOAD);
    throw new Error('Invalid category id');
  }

  try {
    await update('category')
      .given(request.body)
      .where('uuid', '=', request.params.id)
      .execute(connection);

    await update('category_description')
      .given(request.body)
      .where('category_description_category_id', '=', category.category_id)
      .execute(connection);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }

  return request.body.id;
};
