const { select } = require("@evershop/mysql-query-builder");
const { pool } = require("../../../../../lib/mysql/connection");
const { getContextValue, setContextValue } = require("../../../../graphql/services/contextHelper")

module.exports = async (request, response, delegate, next) => {
  const tokenPayload = getContextValue(request, "tokenPayload");
  const { sid } = tokenPayload;

  // Check if any cart is associated with the session id
  const cart = await select()
    .from("cart")
    .where("sid", "=", sid)
    .andWhere("status", "=", 1)
    .load(pool);
  if (cart) {
    setContextValue(request, "cartId", cart.uuid);
  } else {
    // Get the customer id from the token payload
    const customerId = tokenPayload.user?.customerId || null;
    if (customerId) {
      // Check if any cart is associated with the customer id
      const cart = await select()
        .from("cart")
        .where("customer_id", "=", customerId)
        .andWhere("status", "=", 1)
        .load(pool);

      if (cart) {
        setContextValue(request, "cartId", cart.uuid);
      } else {
        setContextValue(request, "cartId", null);
      }
    }
  }
  next();
}