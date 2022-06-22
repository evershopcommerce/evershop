const { buildUrl } = require('../../../../lib/router/buildUrl');
const { useSiteComponent } = require('../../../../lib/componee/useSiteComponent');

// eslint-disable-next-line no-multi-assign
exports = module.exports = {
  /** COUPON */
  cart: [
    {
      id: 'couponInput',
      areaId: 'shoppingCartLeft',
      source: useSiteComponent('promotion/views/site/cart/Coupon.js'),
      props: {
        applyApi: buildUrl('couponApply')
      },
      sortOrder: 10
    }
  ]
};
