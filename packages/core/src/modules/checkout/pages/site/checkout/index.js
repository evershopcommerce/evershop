const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { setContextValue } = require('../../../../graphql/services/buildContext');
const { getCustomerCart } = require('../../../services/getCustomerCart');

module.exports = async (request, response, stack, next) => {
  const cart = await getCustomerCart();
  if (!cart) {
    response.redirect(302, buildUrl('cart'));
    return;
  }
  const items = cart.getItems();

  if (items.length === 0 || cart.hasError()) {
    response.redirect(302, buildUrl('cart'));
  } else {
    setContextValue('pageInfo', { metaTitle: 'Checkout', metaDescription: 'Checkout' });
    next();
  }
};
