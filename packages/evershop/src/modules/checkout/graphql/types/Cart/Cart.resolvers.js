const { select } = require("@evershop/mysql-query-builder");
const { camelCase } = require("../../../../../lib/util/camelCase");
const { getCartByUUID } = require("../../../services/getCartByUUID");

module.exports = {
  Query: {
    cart: async (_, { id }, { cartId }) => {
      const cart = await getCartByUUID(id || cartId);
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
    },
    shippingAddress: async ({ shippingAddressId }, { }, { pool, user }) => {
      const address = await select().from('cart_address').where('cart_address_id', '=', shippingAddressId).load(pool);
      return address ? camelCase(address) : null;
    },
    billingAddress: async ({ shippingAddressId, billingAddressId }, { }, { pool, user }) => {
      const address = await select().from('cart_address').where('cart_address_id', '=', billingAddressId).load(pool);
      return address ? camelCase(address) : null;
    }
  }
}
