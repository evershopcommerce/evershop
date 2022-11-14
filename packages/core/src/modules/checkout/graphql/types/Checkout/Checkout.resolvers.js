const { CartFactory } = require("../../../services/cart/CartFactory");

module.exports = {
  Query: {
    checkout: async (_, { }, { tokenPayload }) => {
      const cart = await CartFactory.getCart(tokenPayload.sid);
      return {
        cartId: cart.getData('uuid')
      }
    }
  }
}
