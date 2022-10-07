const { get } = require('../../../../../lib/util/get');
const { getContext } = require('../../../../graphql/services/contextHelper');
const { getCustomerCart } = require('../../../services/getCustomerCart');
const { createOrder } = require('../../../services/orderCreator');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  try {
    const context = getContext(request);
    const customer = get(context, 'tokenPayload');
    const cart = await getCustomerCart(customer);
    //await stack.savePaymentInfo;
    // TODO: 1: Use middleware to verify cart, 2: Use JWT to verify user, API should stay stateless
    const orderId = await createOrder(cart);
    response.json({
      data: {
        orderId
      },
      success: true,
      message: ''
    });
  } catch (e) {
    response.json({
      data: {},
      success: false,
      message: e.message
    });
  }
};
