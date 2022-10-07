const { get } = require("../../../../../lib/util/get");
const { getContext } = require("../../../../graphql/services/contextHelper");
const { getCustomerCart } = require("../../../services/getCustomerCart");
const { saveCart } = require("../../../services/saveCart");

module.exports = async (request, response, stack, next) => {
  try {
    const context = getContext(request);
    const customer = get(context, 'tokenPayload');
    const cart = await getCustomerCart(customer);
    await cart.setData('customer_email', request.body.email);
    await saveCart(cart);
    response.$body = {
      data: {
        email: cart.getData('customer_email')
      },
      success: true,
      message: ''
    };
  } catch (e) {
    response.$body = {
      data: {},
      success: false,
      message: e.message
    };
  }
  next();
};
