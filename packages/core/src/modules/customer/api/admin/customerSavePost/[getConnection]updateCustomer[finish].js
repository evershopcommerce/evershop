const { update } = require('@evershop/mysql-query-builder');

module.exports = async (request, response, stack) => {
  if (!request.body.customer_id) {
    return null;
  }
  const data = request.body;
  const connection = await stack.getConnection;
  await update('customer').given(data)
    .where('customer_id', '=', data.customer_id)
    .execute(connection);

  return data.customer_id;
};
