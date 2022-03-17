const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response, stack) => {
  const cart = await stack.initCart;
  const items = cart.getItems();

  if (items.length === 0 || cart.hasError()) {
    response.redirect(302, buildUrl('cart'));
  } else {
    assign(response.context, { metaTitle: 'Checkout', metaDescription: 'Checkout' });
  }
};
