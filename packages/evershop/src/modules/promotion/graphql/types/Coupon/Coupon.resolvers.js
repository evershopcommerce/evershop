const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');

module.exports = {
  Cart: {
    applyCouponApi: (cart) => buildUrl('couponApply', { cart_id: cart.uuid })
  }
};
