import { select } from '@evershop/postgres-query-builder';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';

export default {
  Collection: {
    editUrl: (collection) =>
      buildUrl('collectionEdit', { id: collection.uuid }),
    addProductUrl: (collection) =>
      buildUrl('addProductToCollection', { collection_id: collection.uuid }),
    updateApi: (collection) =>
      buildUrl('updateCollection', { id: collection.uuid }),
    deleteApi: (collection) =>
      buildUrl('deleteCollection', { id: collection.uuid })
  },
  Product: {
    removeFromCollectionUrl: async (product, _, { pool }) => {
      if (!product.collectionId) {
        return null;
      } else {
        const collection = await select()
          .from('collection')
          .where('collection_id', '=', product.collectionId)
          .load(pool);
        return buildUrl('removeProductFromCollection', {
          collection_id: collection.uuid,
          product_id: product.uuid
        });
      }
    }
  }
};
