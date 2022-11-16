const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { setContextValue } = require('../../../../graphql/services/contextHelper');

module.exports = async (request, response, stack, next) => {
  const cart = await request.getCart();
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
