module.exports = {
  Query: {
    collectionProductsWidget: async (root, { collection, count }) => ({
      collection,
      count: count ? parseInt(count, 10) : 5
    })
  }
};
