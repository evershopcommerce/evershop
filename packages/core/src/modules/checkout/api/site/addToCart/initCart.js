const { get } = require('../../../../../lib/util/get');
const { getContext } = require('../../../../graphql/services/contextHelper');
const { Cart } = require('../../../services/cart/cart');
const { getCustomerCart } = require('../../../services/getCustomerCart');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response) => {
  const context = getContext(request);
  const tokenPayload = get(context, 'tokenPayload');
  const cart = await getCustomerCart(tokenPayload) || new Cart(tokenPayload);
  await cart.build();

  return cart;
};
