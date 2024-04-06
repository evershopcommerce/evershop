const { select, update } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { error } = require('@evershop/evershop/src/lib/log/logger');

module.exports = async (request, response, delegate, next) => {
  try {
    const { sessionID } = request;
    const customer = request.getCurrentCustomer();
    if (customer) {
      // Check if there is any cart with the same sid
      const cart = await select()
        .from('cart')
        .where('sid', '=', sessionID)
        .and('status', '=', 1)
        .load(pool);
      if (cart) {
        await update('cart')
          .given({
            customer_group_id: customer.group_id,
            customer_id: customer.customer_id,
            customer_full_name: customer.full_name,
            customer_email: customer.email
          })
          .where('cart_id', '=', cart.cart_id)
          .execute(pool);
      }
    }
  } catch (e) {
    error(e);
  }
  next();
};
