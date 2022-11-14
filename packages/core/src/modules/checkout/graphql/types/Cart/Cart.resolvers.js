const { select } = require("@evershop/mysql-query-builder");
const { camelCase } = require("../../../../../lib/util/camelCase");
const { CartFactory } = require("../../../services/cart/CartFactory");

module.exports = {
  Query: {
    cart: async (_, { }, { tokenPayload }) => {
      const cart = await CartFactory.getCart(tokenPayload.sid);
      if (!cart.getData('cart_id')) {
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
