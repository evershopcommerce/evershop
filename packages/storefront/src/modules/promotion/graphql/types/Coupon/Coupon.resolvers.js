import { buildUrl } from '../../../../../lib/router/buildUrl.js';

export default {
  Cart: {
    applyCouponApi: (cart) => buildUrl('couponApply', { cart_id: cart.uuid }),
    removeCouponApi: (cart) => {
      if (cart.coupon) {
        return buildUrl('couponRemove', {
          cart_id: cart.uuid,
          coupon: cart.coupon
        });
      }
      return null; // Return null if no coupon is applied, or handle as needed
    }
  }
};
