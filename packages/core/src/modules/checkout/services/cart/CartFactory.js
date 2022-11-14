// This factory creates one Cart object per request
const { getContextValue } = require("../../../graphql/services/contextHelper");
const { getCustomerCart } = require("../getCustomerCart");
const { Cart } = require("./Cart");

var CartFactory = {};

CartFactory.init = function init(request, response) {
  // Get the token payload from the request
  const tokenPayload = getContextValue(request, "tokenPayload");
  this.carts = {
    [tokenPayload.sid]: {
      request,
      response,
    }
  };

  // Subscribe to the 'finish' event of the response
  response.on("finish", () => {
    // When the response is finished, delete the cart from the factory
    delete this.carts[tokenPayload.sid];
  }
  );
}

/** 
 * @param {string} uuid
 * @returns {Promise<Cart>}
 * @throws {Error}
*/
CartFactory.getCart = async function getCart(sid) {
  if (!sid) {
    throw new Error("Session ID is required");
  } else {
    const cart = this.carts[sid]?.cart;
    if (cart === undefined) {
      this.carts[sid]['cart'] = getCustomerCart(getContextValue(this.carts[sid].request, "tokenPayload"));
    }

    return await this.carts[sid].cart;
  }
}

exports = module.exports = {};
exports.CartFactory = CartFactory;
