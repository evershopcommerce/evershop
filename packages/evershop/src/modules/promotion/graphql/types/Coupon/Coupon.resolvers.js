import { buildUrl } from '../../../../../lib/router/buildUrl.js';

export default {
  Cart: {
    applyCouponApi: (cart) => buildUrl('couponApply', { cart_id: cart.uuid })
  }
};
