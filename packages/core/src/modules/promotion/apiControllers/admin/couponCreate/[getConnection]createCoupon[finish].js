const { insert } = require('@evershop/mysql-query-builder');

module.exports = async (request, response, stack) => {
  const connection = await stack.getConnection;
  const result = await insert('coupon').given(request.body).execute(connection);

  return result;
};
