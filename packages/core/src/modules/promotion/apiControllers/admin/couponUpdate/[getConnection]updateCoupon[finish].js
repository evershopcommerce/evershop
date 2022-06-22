const { update } = require('@evershop/mysql-query-builder');

module.exports = async (request, response, stack) => {
  const connection = await stack.getConnection;

  // Correct the free_shipping
  request.body.free_shipping = parseInt(request.body.free_shipping) === 1 ? 1 : 0;

  // Save the coupon
  await update('coupon').given(request.body)
    .where('coupon_id', '=', request.params.id)
    .execute(connection);

  return request.params.id;
};
