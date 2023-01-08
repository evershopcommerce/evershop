const { select } = require("@evershop/mysql-query-builder");
const { buildUrl } = require("../../../../../lib/router/buildUrl");
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
      return items.map((item) => {
        return {
          ...camelCase(item),
          removeApi: buildUrl('removeMineCartItem', { item_id: item.uuid })
        }
      });
    },
    shippingAddress: async ({ shippingAddressId }, { }, { pool, user }) => {
      const address = await select()
        .from('cart_address')
        .where('cart_address_id', '=', shippingAddressId)
        .load(pool);
      return address ? camelCase(address) : null;
    },
    billingAddress: async ({ shippingAddressId, billingAddressId }, { }, { pool, user }) => {
      const address = await select()
        .from('cart_address')
        .where('cart_address_id', '=', billingAddressId)
        .load(pool);
      return address ? camelCase(address) : null;
    },
    addItemApi: (cart, { }, { pool, user }) => {
      return buildUrl('addCartItem', { cart_id: cart.uuid });
    },
    addPaymentMethodApi: (cart, { }, { pool, user }) => {
      return buildUrl('addCartPaymentMethod', { cart_id: cart.uuid });
    },
    addShippingMethodApi: (cart, { }, { pool, user }) => {
      return buildUrl('addCartShippingMethod', { cart_id: cart.uuid });
    },
    addContactInfoApi: (cart, { }, { pool, user }) => {
      return buildUrl('addCartContactInfo', { cart_id: cart.uuid });
    },
    addAddressApi: (cart, { }, { pool, user }) => {
      return buildUrl('addCartAddress', { cart_id: cart.uuid });
    }
  }
}