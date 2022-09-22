const { get } = require('../../../../../lib/util/get');
const { context } = require('../../../../graphql/services/buildContext');
const { Cart } = require('../../../services/cart/cart');
const { getCustomerCart } = require('../../../services/getCustomerCart');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response) => {
  const tokenPayload = get(context, 'tokenPayload');
  const cart = await getCustomerCart() || new Cart({ sid: tokenPayload.sid });
  await cart.build();

  return cart;
};
