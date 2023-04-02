const { insert } = require('@evershop/postgres-query-builder');

module.exports = async (request, response, delegate) => {
  const connection = await delegate.getConnection;
  const data = request.body;
  const result = await insert('category').given(data).execute(connection);

  await insert('category_description')
    .given(data)
    .prime('category_description_category_id', result.insertId)
    .execute(connection);

  return result;
};
