const { select, update } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  getContextValue,
  setContextValue
} = require('../../../../graphql/services/contextHelper');

module.exports = async (request, response, delegate, next) => {
  const customerTokenPayload = getContextValue(request, 'customerTokenPayload');
  const { sid } = customerTokenPayload;

  // Check if any cart is associated with the session id
  const cart = await select()
    .from('cart')
    .where('sid', '=', sid)
    .andWhere('status', '=', 1)
    .load(pool);

  if (cart) {
    setContextValue(request, 'cartId', cart.uuid);
  } else {
    // Get the customer id from the token payload
    const customerId = customerTokenPayload.customer?.customerId || null;
    if (customerId) {
      // Check if any cart is associated with the customer id
      const customerCart = await select()
        .from('cart')
        .where('customer_id', '=', customerId)
        .andWhere('status', '=', 1)
        .load(pool);

      if (customerCart) {
        // Update the cart with the session id
        await update('cart')
          .given({ sid })
          .where('uuid', '=', customerCart.uuid)
          .execute(pool);

        setContextValue(request, 'cartId', customerCart.uuid);
      } else {
        setContextValue(request, 'cartId', null);
      }
    }
  }
  next();
};
