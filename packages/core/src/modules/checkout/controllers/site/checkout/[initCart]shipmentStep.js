const { assign } = require('../../../../../lib/util/assign');
const { addressValidator } = require('../../../services/addressValidator');
const { buildUrl } = require('../../../../../lib/router/buildUrl');

module.exports = async (request, response, stack) => {
  const cart = await stack.initCart;
  const step = {
    id: 'shipment', title: 'Shipping', isCompleted: false, sortOrder: 10
  };
  if (addressValidator(cart.getData('shippingAddress')) && cart.getData('shipping_method')) {
    step.isCompleted = true;
  }
  assign(response.context, { checkout: { steps: [step], setShipmentInfoAPI: buildUrl('checkoutSetShipmentInfo') } });
};
