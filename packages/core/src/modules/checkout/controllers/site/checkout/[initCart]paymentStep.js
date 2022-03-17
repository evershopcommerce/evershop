const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { assign } = require('../../../../../lib/util/assign');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack) => {
  // let cart = await stack["initCart"];
  const step = {
    id: 'payment', title: 'Payment', isCompleted: false, sortOrder: 15
  };

  assign(response.context, {
    checkout: {
      steps: [step],
      setPaymentInfoAPI: buildUrl('checkoutSetPaymentInfo'),
      setBillingAddressAPI: buildUrl('checkoutSetBillingAddressInfo'),
      getPaymentMethodsAPI: buildUrl('checkoutGetPaymentMethods'),
      placeOrderAPI: buildUrl('checkoutPlaceOrder'),
      checkoutSuccessUrl: buildUrl('checkoutSuccess'),
      checkoutSuccessPage: buildUrl('checkoutSuccess')
    }
  });
};
