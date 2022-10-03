const { select } = require("@evershop/mysql-query-builder");
const { camelCase } = require("../../../../../lib/util/camelCase");
const { getCustomerCart } = require("../../../services/getCustomerCart");

module.exports = {
  Query: {
    bestSellers: async (_, { }, { tokenPayload }) => {
      const cart = await getCustomerCart(tokenPayload);
      if (!cart) {
        return null;
      } else {
        return camelCase(cart.export())
      }
    }
  }
}
