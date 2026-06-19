import { select } from '@evershop/postgres-query-builder';
import { debug } from '../../../../../lib/log/logger.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getFrontStoreSessionCookieName } from '../../../../auth/services/getFrontStoreSessionCookieName.js';
import { getMyCart } from '../../../../checkout/services/getMyCart.js';
import { getCartByUUID } from '../../../services/getCartByUUID.js';

export default {
  Query: {
    cart: async (_, { id }) => {
      try {
        const cart = await getCartByUUID(id);
        return camelCase(cart.exportData());
      } catch (error) {
        return null;
      }
    },
    myCart: async (_, __, { signedCookies, customer }) => {
      try {
        const storeCookieName = getFrontStoreSessionCookieName();
        // Check if the sessionID cookie is present
        const sessionID = signedCookies[storeCookieName];
        const cart = await getMyCart(sessionID, customer?.customer_id);
        return cart ? camelCase(cart.exportData()) : null;
      } catch (error) {
        debug('Error in checkout resolver:');
        debug(error);
        return null;
      }
    }
  },
  Cart: {
    /**
     * Re-shape the JSONB column into the camelCase GraphQL type. The DB JSONB
     * keeps snake_case keys (matching the design doc); GraphQL exposes
     * camelCase. Inner snapshot fields are already camelCase (ShippingMethod
     * is defined that way in TS) so they pass through unchanged.
     */
    shippingMethodData: (cart) => {
      const data = cart.shippingMethodData;
      if (!data) return null;
      return {
        providerCode: data.provider_code,
        methodCode: data.method_code,
        snapshot: data.snapshot,
        fingerprint: data.fingerprint,
        quotedAt: data.quotedAt
      };
    },
    /** Convenience: extract method display name from the JSONB snapshot. */
    shippingMethodName: (cart) =>
      cart.shippingMethodData?.snapshot?.name ?? null,
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
    addNoteApi: (cart) => buildUrl('addShippingNote', { cart_id: cart.uuid }),
    checkoutApi: (cart) => buildUrl('cartCheckout', { cart_id: cart.uuid })
  },
  CartItem: {
    thumbnail: ({ thumbnail }) => {
      return thumbnail;
    },
    total: ({ lineTotalInclTax }) =>
      // This field is deprecated, use lineTotalInclTax instead
      lineTotalInclTax,
    subTotal: ({ lineTotal }) =>
      // This field is deprecated, use lineTotal instead
      lineTotal,
    variantOptions: ({ variantOptions }) => {
      try {
        return JSON.parse(variantOptions || '[]').map((option) => ({
          ...camelCase(option),
          attributeId: parseInt(option.attribute_id, 10),
          optionId: parseInt(option.option_id, 10)
        }));
      } catch (error) {
        return [];
      }
    }
  }
};
