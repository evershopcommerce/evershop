const { v4: uuidv4 } = require('uuid');
const { select } = require('@evershop/postgres-query-builder');
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
      await root.init(filters);
      return root;
    }
  },
  Collection: {
    products: async (collection, { filters = [] }, { user }) => {
      const query = getProductsByCollectionBaseQuery(collection.collectionId);
      const root = new ProductCollection(query);
      await root.init(filters, !!user);
      return root;
    },
    description: ({ description }) => {
      try {
        return JSON.parse(description);
      } catch (e) {
        // This is for backward compatibility. If the description is not a JSON string then it is a raw HTML block
        const rowId = `r__${uuidv4()}`;
        return [
          {
            size: 1,
            id: rowId,
            columns: [
              {
                id: 'c__c5d90067-c786-4324-8e24-8e30520ac3d7',
                size: 1,
                data: {
                  time: 1723347125344,
                  blocks: [
                    {
                      id: 'AU89ItzUa7',
                      type: 'raw',
                      data: {
                        html: description
                      }
                    }
                  ],
                  version: '2.30.2'
                }
              }
            ]
          }
        ];
      }
    }
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
    }
  }
};
