const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { get } = require('../../../../../lib/util/get');
const { setContextValue } = require('../../../../graphql/services/contextHelper');
const { getContext } = require('../../../../graphql/services/contextHelper');
const { getCustomerCart } = require('../../../services/getCustomerCart');

module.exports = async (request, response, stack, next) => {
  const context = getContext(request);
  const customer = get(context, 'tokenPayload');
  const cart = await getCustomerCart(customer);
  if (!cart) {
    response.redirect(302, buildUrl('cart'));
    return;
  }
  const items = cart.getItems();

  if (items.length === 0 || cart.hasError()) {
    response.redirect(302, buildUrl('cart'));
  } else {
    setContextValue(request, 'pageInfo', { title: 'Checkout', description: 'Checkout' });
    next();
  }
};
