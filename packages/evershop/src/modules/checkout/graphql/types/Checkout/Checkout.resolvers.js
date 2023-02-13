module.exports = {
  Query: {
    checkout: async (r, c, { cartId }) => ({
      cartId
    })
  }
};
