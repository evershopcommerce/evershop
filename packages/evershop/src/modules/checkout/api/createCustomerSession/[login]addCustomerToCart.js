const { select, update } = require("@evershop/mysql-query-builder");
const { pool } = require("../../../../lib/mysql/connection");
const { getContextValue } = require("../../../graphql/services/contextHelper");

module.exports = async (request, response, delegate, next) => {
  try {
    const tokenPayload = getContextValue(request, 'tokenPayload');
    const { sid, user: { fullName, email, customerId } } = tokenPayload;
    // Check if there is any cart with the same sid
    const cart = await select()
      .from('cart')
      .where('sid', '=', sid)
      .and('status', '=', 1)
      .load(pool);
    if (cart) {
      await update('cart')
        .given({
          customer_id: customerId,
          customer_name: fullName,
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
