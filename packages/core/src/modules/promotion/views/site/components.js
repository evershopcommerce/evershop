const { buildUrl } = require('../../../../lib/router/buildUrl');
const { useComponent } = require('../../../../lib/componee/useComponent');

// eslint-disable-next-line no-multi-assign
exports = module.exports = {
  /** COUPON */
  cart: [
    {
      id: 'couponInput',
      areaId: 'shoppingCartLeft',
      source: useComponent('cart/Coupon.js'),
      props: {
        applyApi: buildUrl('couponApply')
      },
      sortOrder: 10
    }
  ]
};
