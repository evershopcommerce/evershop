// This factory creates one Cart object per request
const { getContextValue } = require('../../../graphql/services/contextHelper');
const { getCustomerCart } = require('../getCustomerCart');

const CartFactory = {};

CartFactory.init = function init(request, response) {
  // Get the token payload from the request
  const customerTokenPayload = getContextValue(request, 'customerTokenPayload');
  this.carts = {
    [customerTokenPayload.sid]: {
      request,
      response
    }
  };

  // Subscribe to the 'finish' event of the response
  response.on('finish', () => {
    // When the response is finished, delete the cart from the factory
    delete this.carts[customerTokenPayload.sid];
  });
};

/**
 * @param {string} uuid
 * @returns {Promise<Cart>}
 * @throws {Error}
 */
CartFactory.getCart = async function getCart(sid) {
  if (!sid) {
    throw new Error('Session ID is required');
  } else {
    if (this.carts[sid]?.cart === undefined) {
      this.carts[sid].cart = getCustomerCart(
        getContextValue(this.carts[sid].request, 'customerTokenPayload')
      );
    }

    const cart = await this.carts[sid].cart;
    return cart;
  }
};

// eslint-disable-next-line no-multi-assign
exports = module.exports = {};
exports.CartFactory = CartFactory;
