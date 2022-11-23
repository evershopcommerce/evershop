const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { setContextValue, getContextValue } = require('../../../../graphql/services/contextHelper');
const { getCustomerCart } = require('../../../services/getCustomerCart');

module.exports = async (request, response, stack, next) => {
  const cart = await getCustomerCart(getContextValue(request, 'tokenPayload', {}));
  if (!cart) {
    response.redirect(302, buildUrl('cart'));
    return;
  }
  const items = cart.getItems();

  if (items.length === 0 || cart.hasItemError()) {
    response.redirect(302, buildUrl('cart'));
  } else {
    setContextValue(request, 'pageInfo', { title: 'Checkout', description: 'Checkout' });
    next();
  }
};
