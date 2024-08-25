const { select } = require('@evershop/postgres-query-builder');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { getCartByUUID } = require('../../../services/getCartByUUID');

module.exports = {
  Query: {
    cart: async (_, { id }, { cartId }) => {
      try {
        const cart = await getCartByUUID(id || cartId);
        return camelCase(cart.exportData());
      } catch (error) {
        return null;
      }
    }
  },
  Cart: {
    items: async (cart) => {
      const items = cart.items || [];
      return items.map((item) => ({
        ...camelCase(item),
        removeApi: buildUrl('removeCartItem', {
          item_id: item.uuid,
          cart_id: cart.uuid
        }),
        updateQtyApi: buildUrl('updateCartItemQty', {
          cart_id: cart.uuid,
          item_id: item.uuid
        })
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
    addAddressApi: (cart) => buildUrl('addCartAddress', { cart_id: cart.uuid }),
    addNoteApi: (cart) => buildUrl('addShippingNote', { cart_id: cart.uuid })
  },
  CartItem: {
    total: ({ lineTotalInclTax }) =>
      // This field is deprecated, use lineTotalInclTax instead
      lineTotalInclTax,
    subTotal: ({ lineTotal }) =>
      // This field is deprecated, use lineTotal instead
      lineTotal
  }
};
