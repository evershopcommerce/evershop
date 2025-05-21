import { SelectQuery } from '@evershop/postgres-query-builder';
import { getProductsBaseQuery } from './getProductsBaseQuery.js';

export const getProductsByCollectionBaseQuery = (
  collectionId: number
): SelectQuery => {
  const query = getProductsBaseQuery();
  query
    .leftJoin('product_collection')
    .on('product_collection.product_id', '=', 'product.product_id')
    .and('product_collection.collection_id', '=', collectionId);

  query.andWhere('product_collection.collection_id', '=', collectionId);
  return query;
};
