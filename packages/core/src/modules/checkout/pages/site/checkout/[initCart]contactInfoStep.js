const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response, stack) => {
  const cart = await stack.initCart;
  const step = {
    id: 'contact', title: 'Contact info', isCompleted: false, sortOrder: 5
  };
  if (cart.getData('customer_email')) { step.isCompleted = true; }

  assign(response.context, { checkout: { steps: [step], setContactInfo: buildUrl('checkoutSetContactInfo') } });
};
