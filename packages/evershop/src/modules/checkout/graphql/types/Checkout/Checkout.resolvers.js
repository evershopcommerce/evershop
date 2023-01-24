module.exports = {
  Query: {
    checkout: async (_, { }, { cartId }) => ({
      cartId
    })
  }
};
