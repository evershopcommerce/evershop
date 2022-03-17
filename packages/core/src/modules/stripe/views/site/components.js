const { useSiteComponent } = require('../../../../lib/componee/useSiteComponent');

// eslint-disable-next-line no-multi-assign
exports = module.exports = {
  checkout: [
    {
      id: 'stripePaymentForm',
      areaId: 'checkoutPaymentMethods',
      source: useSiteComponent('stripe/views/site/checkout/PaymentFormContext.js'),
      props: {},
      sortOrder: 10
    }
  ]
};
