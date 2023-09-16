const { select } = require('@evershop/postgres-query-builder');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { ProductCollection } = require('../../../services/ProductCollection');
const {
  getProductsByCollectionBaseQuery
} = require('../../../services/getProductsByCollectionBaseQuery');
const {
  getCollectionsBaseQuery
} = require('../../../services/getCollectionsBaseQuery');
const {
  CollectionCollection
} = require('../../../services/CollectionCollection');

module.exports = {
  Query: {
    collection: async (_, { code }, { pool }) => {
      const query = select().from('collection');
      query.where('code', '=', code);
      const result = await query.load(pool);
      return result ? camelCase(result) : null;
    },
    collections: async (_, { filters = [] }) => {
      const query = getCollectionsBaseQuery();
      const root = new CollectionCollection(query);
      await root.init({}, { filters });
      return root;
    }
  },
  Collection: {
    products: async (collection, { filters = [] }, { user }) => {
      const query = getProductsByCollectionBaseQuery(collection.collectionId);
      const root = new ProductCollection(query);
      await root.init(collection, { filters }, { user });
      return root;
    },
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
    collections: async (product, _, { pool }) => {
      const query = getCollectionsBaseQuery();
      query
        .leftJoin('product_collection')
        .on(
          'collection.collection_id',
          '=',
          'product_collection.collection_id'
        );
      query.where('product_id', '=', product.productId);
      return (await query.execute(pool)).map((row) => camelCase(row));
    },
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
