const { insert } = require('@nodejscart/mysql-query-builder');

module.exports = async (request, response, stack) => {
  if (request.body.attribute_id) { return null; }
  const connection = await stack.getConnection;
  const result = await insert('attribute').given(request.body).execute(connection);

  return result;
};
