export default {
  Query: {
    checkout: async (r, c, { cartId }) => ({
      cartId
    })
  }
};
