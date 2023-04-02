const { insert } = require('@evershop/postgres-query-builder');

module.exports = async (request, response, delegate) => {
  const connection = await delegate.getConnection;
  const result = await insert('attribute')
    .given(request.body)
    .execute(connection);

  return result;
};
