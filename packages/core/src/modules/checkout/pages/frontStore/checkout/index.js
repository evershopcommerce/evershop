const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { get } = require('../../../../../lib/util/get');
const { setContextValue } = require('../../../../graphql/services/contextHelper');
const { getContext } = require('../../../../graphql/services/contextHelper');
const { CartFactory } = require('../../../services/cart/CartFactory');

module.exports = async (request, response, stack, next) => {
  const context = getContext(request);
  const tokenPayload = get(context, 'tokenPayload');
  const cart = await CartFactory.getCart(tokenPayload.sid);
  if (!cart) {
    response.redirect(302, buildUrl('cart'));
    return;
  }
  const items = cart.getItems();

  if (items.length === 0 || cart.hasError()) {
    response.redirect(302, buildUrl('cart'));
  } else {
    setContextValue(request, 'pageInfo', { title: 'Checkout', description: 'Checkout' });
    setContextValue(request, 'cartId', cart.getData('uuid'));
    next();
  }
};
