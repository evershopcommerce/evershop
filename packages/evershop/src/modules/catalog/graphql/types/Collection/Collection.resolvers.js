import { select } from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { CollectionCollection } from '../../../../../modules/catalog/services/CollectionCollection.js';
import { getCollectionsBaseQuery } from '../../../../../modules/catalog/services/getCollectionsBaseQuery.js';
import { getProductsByCollectionBaseQuery } from '../../../../../modules/catalog/services/getProductsByCollectionBaseQuery.js';
import { ProductCollection } from '../../../../../modules/catalog/services/ProductCollection.js';

export default {
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
