const { insert } = require('@evershop/mysql-query-builder');

module.exports = async (request, response, stack) => {
  if (request.body.customer_id) {
    return null;
  }
  const data = request.body;
  const connection = await stack.getConnection;
  const result = await insert('customer').given({ ...data }).execute(connection);

  return result;
};
