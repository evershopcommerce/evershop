const { useComponent } = require('../../../../lib/componee/useComponent');

// eslint-disable-next-line no-multi-assign
exports = module.exports = {
  checkout: [
    {
      id: 'stripePaymentForm',
      areaId: 'checkoutPaymentMethods',
      source: useComponent('checkout/PaymentFormContext.js'),
      props: {},
      sortOrder: 10
    }
  ]
};
