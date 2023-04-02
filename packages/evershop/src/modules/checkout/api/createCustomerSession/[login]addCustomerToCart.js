const { select, update } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { getContextValue } = require('../../../graphql/services/contextHelper');

module.exports = async (request, response, delegate, next) => {
  try {
    const customerTokenPayload = getContextValue(
      request,
      'customerTokenPayload'
    );
    const {
      sid,
      customer: { fullName, email, customerId, groupId }
    } = customerTokenPayload;
    // Check if there is any cart with the same sid
    const cart = await select()
      .from('cart')
      .where('sid', '=', sid)
      .and('status', '=', 1)
      .load(pool);
    if (cart) {
      await update('cart')
        .given({
          customer_group_id: groupId,
          customer_id: customerId,
          customer_full_name: fullName,
          customer_email: email
        })
        .where('cart_id', '=', cart.cart_id)
        .execute(pool);
    }
    next();
  } catch (error) {
    // TODO: Log error
    // Let the request continue
    next();
  }
};
