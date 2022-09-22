const { camelCase } = require("../../../../../lib/util/camelCase");
const { getCustomerCart } = require("../../../services/getCustomerCart");

module.exports = {
  Query: {
    cart: async () => {
      const cart = await getCustomerCart();
      if (!cart) {
        return null;
      } else {
        return camelCase(cart.export())
      }
    }
  },
  Cart: {
    items: async (cart, { }, { pool, user }) => {
      const items = cart.items || [];
      return items.map((item) => camelCase(item));
    }
  }
}
