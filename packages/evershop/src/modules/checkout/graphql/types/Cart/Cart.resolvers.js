const { select } = require('@evershop/postgres-query-builder');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { getCartByUUID } = require('../../../services/getCartByUUID');

module.exports = {
  Query: {
    cart: async (_, { id }, { cartId }) => {
      const cart = await getCartByUUID(id || cartId);
      if (!cart) {
        return null;
      } else {
        return camelCase(cart.export());
      }
    }
  },
  Cart: {
    items: async (cart) => {
      const items = cart.items || [];
      return items.map((item) => ({
        ...camelCase(item),
        removeApi: buildUrl('removeMineCartItem', { item_id: item.uuid })
      }));
    },
    shippingAddress: async ({ shippingAddressId }, _, { pool }) => {
      const address = await select()
        .from('cart_address')
        .where('cart_address_id', '=', shippingAddressId)
        .load(pool);
      return address ? camelCase(address) : null;
    },
    billingAddress: async ({ billingAddressId }, _, { pool }) => {
      const address = await select()
        .from('cart_address')
        .where('cart_address_id', '=', billingAddressId)
        .load(pool);
      return address ? camelCase(address) : null;
    },
    addItemApi: (cart) => buildUrl('addCartItem', { cart_id: cart.uuid }),
    addPaymentMethodApi: (cart) =>
      buildUrl('addCartPaymentMethod', { cart_id: cart.uuid }),
    addShippingMethodApi: (cart) =>
      buildUrl('addCartShippingMethod', { cart_id: cart.uuid }),
    addContactInfoApi: (cart) =>
      buildUrl('addCartContactInfo', { cart_id: cart.uuid }),
    addAddressApi: (cart) => buildUrl('addCartAddress', { cart_id: cart.uuid })
  }
};
