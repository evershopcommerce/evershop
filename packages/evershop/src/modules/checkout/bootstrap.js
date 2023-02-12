const { request } = require('express');
const { getContextValue } = require('../graphql/services/contextHelper');
const { getCartByUUID } = require('./services/getCartByUUID');

module.exports = () => {
  /**
   * This method get the current cart object
   * It requires a jwt token must be available, else it will return null
   * If this function is called with a cartId,
   * it will return the cart by that id. Else it will return the cart by the token payload
   * @returns {Promise<Cart>}
   * @returns {Promise<null>}
   */
  request.getCart = async function getCart(uuid) {
    this.locals = this.locals || {};
    if (this.locals?.cart) {
      return this.locals.cart;
    }
    if (uuid) {
      this.locals.cart = await getCartByUUID(uuid);
    } else {
      const id = getContextValue(this, 'cartId');
      if (id) {
        this.locals.cart = await getCartByUUID(id);
      }
    }

    return this.locals.cart || null;
  };
};
