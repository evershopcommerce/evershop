const { getProductsBaseQuery } = require('./getProductsBaseQuery');

module.exports.getProductsByCollectionBaseQuery = (collectionId) => {
  const query = getProductsBaseQuery();
  query
    .leftJoin('product_collection')
    .on('product_collection.product_id', '=', 'product.product_id')
    .and('product_collection.collection_id', '=', collectionId);

  query.andWhere('product_collection.collection_id', '=', collectionId);
  return query;
};
