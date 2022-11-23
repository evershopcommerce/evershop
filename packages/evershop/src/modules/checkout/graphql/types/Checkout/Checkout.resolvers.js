module.exports = {
  Query: {
    checkout: async (_, { }, { cartId }) => {
      return {
        cartId: cartId
      }
    }
  }
}
