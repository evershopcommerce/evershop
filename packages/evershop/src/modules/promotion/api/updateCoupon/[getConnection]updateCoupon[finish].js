const { update } = require('@evershop/postgres-query-builder');

module.exports = async (request, response, delegate) => {
  const connection = await delegate.getConnection;
  // Save the coupon
  await update('coupon')
    .given(request.body)
    .where('uuid', '=', request.params.id)
    .execute(connection);

  return request.params.id;
};
