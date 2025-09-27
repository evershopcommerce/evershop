export default {
  Query: {
    collectionProductsWidget: async (
      root,
      { collection, count, countPerRow }
    ) => ({
      collection,
      count: count ? parseInt(count, 10) : 5,
      countPerRow: countPerRow ? parseInt(countPerRow, 10) : 4
    })
  }
};
